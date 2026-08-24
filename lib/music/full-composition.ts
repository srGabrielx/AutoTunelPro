import { generateDrums } from "../engines/drums.ts";
import { generateMelody } from "../engines/melody.ts";
import { buildCanonicalTimeline } from "./canonical-timeline.ts";
import type {
  ArrangementBlockData,
  ArrangementBlockType,
  GenerateAllPayload,
  GenerateAllResponseData,
  GenerateDrumsResponseData,
  SelectiveGenerationContext,
} from "../workers/protocol.ts";
import type {
  BassNote,
  BassResult,
  DrumHit,
  DrumResult,
  MelodyLayer,
  MelodyNote,
  MelodyResult,
  ScaleId,
  StyleId,
} from "./types.ts";
import { buildCompositionPlan, type CompositionPlan } from "./composition-plan.ts";
import { deriveSeed, hashHex, hashString, makeSeed, rng } from "./random.ts";
import { KEYS, SCALES, STYLES } from "./styles.ts";
import { resolvePresetProfile } from "./preset-resolver.ts";

const PPQ = 960 as const;
const STEPS_PER_BAR = 16;
interface CompositionVersions {
  schemaVersion: number;
  engineVersion: string;
  presetVersion: number;
}

const DEFAULT_VERSIONS: CompositionVersions = {
  schemaVersion: 2,
  engineVersion: "full-composition-v1",
  presetVersion: 1,
} as const;

const SECTION_SPECS: ReadonlyArray<{
  type: Exclude<ArrangementBlockType, "outro">;
  energy: number;
  complexityOffset: number;
  density: number;
}> = [
  { type: "intro", energy: 0.38, complexityOffset: -2, density: 0.42 },
  { type: "verse", energy: 0.68, complexityOffset: 0, density: 0.74 },
  { type: "drop", energy: 0.96, complexityOffset: 1, density: 1 },
];

type MelodyLayerInput = GenerateAllPayload["melodyLayers"][number];

export interface FullCompositionOptions extends GenerateAllPayload {
  /** Alias accepted by pure callers; the worker-facing field remains `seed`. */
  masterSeed?: number | string;
  /** Allows a persisted snapshot to retain its already-computed hash. */
  parametersHash?: string;
}

interface ResolvedInput {
  presetId?: string;
  bpm: number;
  key: string;
  globalScale: ScaleId;
  complexity: number;
  bassStyle: StyleId;
  bassOctave: GenerateAllPayload["bassOctave"];
  drumStyle: StyleId;
  drumPattern: GenerateAllPayload["drumPattern"];
  swing?: number;
  rollDensity?: number;
  humanize?: number;
  melodyLayers: MelodyLayerInput[];
}

interface Candidate {
  attempt: number;
  blocks: ArrangementBlockData[];
  planHash: string;
  timelineHash: string;
  timelineEndTick: number;
  score: number;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function canonicalSerialize(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalSerialize).join(",")}]`;
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) =>
      `${JSON.stringify(key)}:${canonicalSerialize(item)}`
    ).join(",")}}`;
  }
  return "null";
}

export function hashCompositionValue(value: unknown): string {
  const serialized = canonicalSerialize(value);
  return `${hashHex(serialized)}${hashHex(`composition:${serialized}`)}`;
}

/** Hashes every serializable plan field, including identity-bearing metadata. */
export function hashCompositionPlan(plan: CompositionPlan): string {
  return hashCompositionValue(plan);
}

function resolveStyle(value: StyleId, fallback: StyleId): StyleId {
  return value in STYLES ? value : fallback;
}

function resolveScale(value: ScaleId): ScaleId {
  return value in SCALES ? value : "natural-minor";
}

function resolveInput(input: FullCompositionOptions): ResolvedInput {
  const drumStyle = resolveStyle(input.drumStyle, "trap-br");
  const bassStyle = resolveStyle(input.bassStyle, drumStyle);
  const globalScale = resolveScale(input.globalScale);
  const key = input.key in KEYS ? input.key : "C";
  const melodyLayers = input.melodyLayers.map((layer) => ({
    ...layer,
    style: resolveStyle(layer.style, bassStyle),
    // A full composition has one harmonic authority. Per-layer stale UI values
    // must not silently create parallel keys/scales.
    key,
    scale: globalScale,
  }));

  return {
    presetId: input.presetId,
    bpm: clamp(Number(input.bpm) || STYLES[drumStyle].bpm[0], 40, 300),
    key,
    globalScale,
    complexity: clamp(Math.trunc(Number(input.complexity) || 3), 1, 5),
    bassStyle,
    bassOctave: input.bassOctave,
    drumStyle,
    drumPattern: input.drumPattern,
    swing: input.swing === undefined ? undefined : clamp(input.swing, 0, 100),
    rollDensity: input.rollDensity === undefined
      ? undefined
      : clamp(input.rollDensity, 0, 100),
    humanize: input.humanize === undefined
      ? undefined
      : clamp(input.humanize, 0, 100),
    melodyLayers,
  };
}

function extractProfiles(input: ResolvedInput) {
  const preset = resolvePresetProfile(input.presetId, input.drumStyle);
  return {
    drumProfile: preset.drumProfile,
    melodyProfile: preset.melodyProfile,
    bassProfile: preset.bassProfile,
  };
}

function resolveMasterSeed(value: number | string | undefined): number {
  if (typeof value === "number") return makeSeed(value);
  if (typeof value === "string") {
    const numeric = Number(value);
    return value.trim() !== "" && Number.isFinite(numeric)
      ? makeSeed(numeric)
      : hashString(value);
  }
  return 0;
}

function resolveVersions(options: FullCompositionOptions): CompositionVersions {
  return {
    schemaVersion: Math.max(1, Math.trunc(
      options.versions?.schemaVersion ?? DEFAULT_VERSIONS.schemaVersion,
    )),
    engineVersion: options.versions?.engineVersion ?? DEFAULT_VERSIONS.engineVersion,
    presetVersion: Math.max(1, Math.trunc(
      options.versions?.presetVersion ?? DEFAULT_VERSIONS.presetVersion,
    )),
  };
}

function resolvePrimaryStyle(input: ResolvedInput): StyleId {
  return input.melodyLayers.find((layer) => !layer.muted)?.style
    ?? input.melodyLayers[0]?.style
    ?? input.bassStyle;
}

interface CandidateGenerationContext {
  namespace: string[];
  plan: CompositionPlan;
  planHash: string;
  primaryStyle: StyleId;
}

function buildCandidateGenerationContext(
  input: ResolvedInput,
  masterSeed: number,
  variationIndex: number,
  parametersHash: string,
  versions: CompositionVersions,
  attempt: number,
): CandidateGenerationContext {
  const primaryStyle = resolvePrimaryStyle(input);
  const namespace = [
    `preset:${input.presetId ?? primaryStyle}`,
    `preset-version:${versions.presetVersion}`,
    `engine-version:${versions.engineVersion}`,
    `schema-version:${versions.schemaVersion}`,
    `parameters:${parametersHash}`,
    `variation:${variationIndex}`,
    `attempt:${attempt}`,
  ];
  const planSeed = deriveSeed(masterSeed, ...namespace, "plan:global");
  const plan = buildCompositionPlan({
    style: primaryStyle,
    bpm: input.bpm,
    key: input.key,
    scale: input.globalScale,
    complexity: input.complexity,
    seed: planSeed,
  });
  return {
    namespace,
    plan,
    planHash: hashCompositionPlan(plan),
    primaryStyle,
  };
}

function eventChance(seed: number, namespace: string, step: number): number {
  return rng(deriveSeed(seed, namespace, step))();
}

function buildTimelineMelodyLayers(input: ResolvedInput): MelodyLayer[] {
  return input.melodyLayers.map((layer) => ({
    id: layer.id,
    label: layer.label?.trim() || layer.id,
    synthType: layer.synthType ?? "lead",
    style: layer.style,
    key: layer.key,
    scale: layer.scale,
    muted: layer.muted,
    result: null,
  }));
}

function buildParameterSnapshot(input: ResolvedInput): ResolvedInput {
  return {
    ...input,
    melodyLayers: input.melodyLayers.map(
      ({ id, label, synthType, style, key, scale, muted }) => ({
        id,
        label,
        synthType,
        style,
        key,
        scale,
        muted,
      }),
    ),
  };
}

function clampVelocity(value: number): number {
  return Math.round(clamp(value, 1, 127));
}

function clampMicroTiming(value: number): number {
  return Math.round(clamp(value, -15, 15));
}

function makeProfileHit(
  input: ResolvedInput,
  seed: number,
  drum: DrumHit["drum"],
  step: number,
): DrumHit {
  const baseVelocity = drum === "kick" ? 108 : drum === "hat" ? 82 : 101;
  const velocityNoise = eventChance(seed, `${drum}:velocity`, step) * 18 - 9;
  const isProtectedBeat = (drum === "kick" || drum === "snare" || drum === "clap")
    && step % 4 === 0;
  const swing = step % 2 === 1 ? (input.swing ?? 0) * 0.1 : 0;
  const jitter = (eventChance(seed, `${drum}:timing`, step) * 2 - 1)
    * ((input.humanize ?? 0) / 100) * 3.5;

  return {
    step,
    drum,
    velocity: clampVelocity(baseVelocity + velocityNoise),
    microTimingMs: isProtectedBeat ? 0 : clampMicroTiming(swing + jitter),
  };
}

function dedupeDrums(hits: DrumHit[]): DrumHit[] {
  const unique = new Map<string, DrumHit>();
  for (const hit of hits) {
    const step = Math.trunc(hit.step);
    if (step < 0 || step >= STEPS_PER_BAR) continue;
    const normalized: DrumHit = {
      ...hit,
      step,
      velocity: clampVelocity(hit.velocity),
      microTimingMs: hit.microTimingMs === undefined
        ? undefined
        : clampMicroTiming(hit.microTimingMs),
    };
    // A generated drum voice may have only one attack at a given grid slot.
    // Sub-attacks belong inside one explicit roll; separate hits here would
    // become doubled MIDI Note Ons with no distinct musical identity.
    const key = `${step}:${normalized.drum}`;
    const previous = unique.get(key);
    if (!previous) {
      unique.set(key, normalized);
      continue;
    }
    const previousRollCount = previous.roll?.count ?? 1;
    const normalizedRollCount = normalized.roll?.count ?? 1;
    const selected = normalizedRollCount > previousRollCount
      || (normalizedRollCount === previousRollCount && normalized.velocity > previous.velocity)
      ? normalized
      : previous;
    unique.set(key, {
      ...selected,
      velocity: Math.max(previous.velocity, normalized.velocity),
    });
  }
  return [...unique.values()].sort((left, right) =>
    left.step - right.step || left.drum.localeCompare(right.drum)
  );
}

function buildDrumDna(
  input: ResolvedInput,
  plan: CompositionPlan,
  seed: number,
): DrumResult {
  const { drumProfile } = extractProfiles(input);
  // generateDrums já consome drumProfile.snareOn/kickDensity internamente.
  // NÃO adicionar os steps de STYLES[style].kick/snare/hat de novo para evitar duplicação.
  const generated = generateDrums({
    style: input.drumStyle,
    bpm: input.bpm,
    complexity: input.complexity,
    seed: seed,
    drumPattern: input.drumPattern,
    swing: input.swing,
    rollDensity: input.rollDensity,
    humanize: input.humanize,
    compositionPlan: plan,
    drumProfile,
  });

  let patterned = dedupeDrums(generated.hits);
  if (input.drumPattern === "half-time") {
    patterned = patterned.filter((hit) => {
      if (hit.drum === "snare" || hit.drum === "clap") return hit.step === 8;
      if (hit.drum === "hat" || hit.drum === "open-hat") return hit.step % 2 === 0;
      return hit.step === 0 || hit.step >= 8;
    });
    if (!patterned.some((hit) =>
      hit.step === 8 && (hit.drum === "snare" || hit.drum === "clap")
    )) {
      patterned.push(makeProfileHit(input, seed, "snare", 8));
    }
  } else if (input.drumPattern === "double-time") {
    for (const step of [4, 12]) {
      patterned.push(makeProfileHit(input, seed, "snare", step));
    }
    for (let step = 0; step < STEPS_PER_BAR; step++) {
      patterned.push(makeProfileHit(input, seed, "hat", step));
    }
  } else if (input.drumPattern === "triplet-rolls") {
    patterned = patterned.map((hit) =>
      hit.drum === "hat" && hit.step % 2 === 1
        ? { ...hit, roll: hit.roll ?? { count: 3, velocityCurve: "decrescendo" } }
        : hit
    );
  }

  return {
    ...generated,
    seed,
    patternMode: input.drumPattern,
    hits: dedupeDrums(patterned),
  };
}

function shapeDrumsForSection(
  dna: DrumResult,
  input: ResolvedInput,
  section: (typeof SECTION_SPECS)[number],
  sectionSeed: number,
): DrumResult {
  const profile = STYLES[input.drumStyle];
  const firstKick = profile.kick[0] ?? 0;
  
  // Arranjo Aditivo: Intro parte de um subconjunto enxuto do DNA, Verse/Drop expandem
  let hits: DrumHit[];
  if (section.type === "intro") {
    // Intro: apenas kicks no tempo forte, snare nos backbeats, e hats nos tempos pares
    hits = dna.hits.filter((hit) => {
      if (hit.drum === "kick") return hit.step === firstKick || hit.step % 8 === 0;
      if (hit.drum === "snare" || hit.drum === "clap") return hit.step === 8 || hit.step === 12;
      if (hit.drum === "hat" || hit.drum === "open-hat") return hit.step % 4 === 0;
      return false; // crash/ride: não no intro
    });
  } else {
    hits = [...dna.hits];
  }

  // Adições por seção para desenvolvimento musical
  if (section.type === "drop") {
    // Adiciona open-hat no início do drop para impacto
    if (!hits.some((h) => h.drum === "open-hat" && h.step === 0)) {
      hits.push(makeProfileHit(input, sectionSeed, "open-hat", 0));
    }
    // Aumenta densidade de kicks e hats
    if (!hits.some((h) => h.drum === "kick" && h.step === 14)) {
      hits.push(makeProfileHit(input, sectionSeed, "kick", 14));
    }
    hits = hits.map((hit) =>
      hit.drum === "hat" && (hit.step % 4 === 3 || hit.step === 10)
        ? { ...hit, roll: hit.roll ?? { count: 2, velocityCurve: "flat" } }
        : hit
    );
  }

  if (section.type === "verse") {
    // Adiciona groove leve no hi-hat
    if (!hits.some((h) => h.drum === "hat" && h.step === 14)) {
      hits.push(makeProfileHit(input, sectionSeed, "hat", 14));
    }
  }

  if (!hits.some((hit) => hit.drum === "kick")) {
    hits.push(makeProfileHit(input, sectionSeed, "kick", firstKick));
  }

  // Preenchimentos (Fills) determinísticos de final de seção
  if (section.type !== "drop") {
    hits = hits.filter((hit) => !(hit.step === 15 && hit.drum === "hat"));
    hits.push({
      ...makeProfileHit(input, sectionSeed, "hat", 15),
      roll: {
        count: input.drumPattern === "triplet-rolls" ? 3 : 2,
        velocityCurve: "crescendo",
      },
    });
  }

  const velocityMultiplier = 0.72 + section.energy * 0.38;
  hits = hits.map((hit) => ({
    ...hit,
    velocity: clampVelocity(hit.velocity * velocityMultiplier),
  }));

  return { ...dna, seed: sectionSeed, hits: dedupeDrums(hits) };
}

function chooseByDeterministicRank<T>(
  values: T[],
  count: number,
  score: (value: T) => number,
): T[] {
  return [...values]
    .sort((left, right) => score(left) - score(right))
    .slice(0, count);
}

function chordPitch(
  plan: CompositionPlan,
  step: number,
  octaveOffset: number,
): number {
  const rootMidi = KEYS[plan.key] ?? 60;
  const intervals = SCALES[plan.scale]?.intervals ?? SCALES["natural-minor"].intervals;
  const region = plan.harmonicGrid.find((item) =>
    item.startStep <= step && step < item.endStep
  ) ?? plan.harmonicGrid[0];
  const degree = region?.chordDegrees[0] ?? 0;
  return rootMidi + octaveOffset + (intervals[degree % intervals.length] ?? 0);
}

function shapeMelodyForSection(
  dna: MelodyResult,
  plan: CompositionPlan,
  input: ResolvedInput,
  section: (typeof SECTION_SPECS)[number],
  sectionSeed: number,
): MelodyResult {
  // DNA Base preservado (Arranjo Aditivo)
  let notes: MelodyNote[] = [...dna.notes];

  const velocityMultiplier = section.type === "intro" ? 0.76 : section.type === "drop" ? 1.1 : 0.94;
  notes = notes.map((note) => ({
    ...note,
    velocity: clampVelocity(note.velocity * velocityMultiplier),
    duration: Math.max(1, Math.min(Math.trunc(note.duration), STEPS_PER_BAR - note.step)),
  }));

  // Expansão de complexidade para seções de maior energia
  if (section.type === "verse" || section.type === "drop") {
    const occupied = new Set(notes.map((note) => note.step));
    const extraDensity = section.type === "verse" ? 1 : Math.max(2, input.complexity - 1);
    const desired = Math.min(STEPS_PER_BAR, dna.notes.length + extraDensity);
    
    const availableSteps = Array.from({ length: STEPS_PER_BAR }, (_, step) => step)
      .filter((step) => !occupied.has(step));
      
    const additions = chooseByDeterministicRank(
      availableSteps,
      Math.max(0, desired - notes.length),
      (step) => eventChance(sectionSeed, "melody:add", step),
    );
    
    for (const step of additions) {
      notes.push({
        step,
        note: chordPitch(plan, step, step % 8 === 0 ? 12 : 0),
        velocity: clampVelocity((section.type === "drop" ? 88 : 78) + section.energy * 22),
        duration: Math.min(2, STEPS_PER_BAR - step),
      });
    }
  }

  return {
    ...dna,
    seed: sectionSeed,
    key: input.key,
    scale: input.globalScale,
    notes: notes.sort((left, right) => left.step - right.step),
  };
}

function buildCoordinatedBass(
  input: ResolvedInput,
  plan: CompositionPlan,
  drums: DrumResult,
  section: (typeof SECTION_SPECS)[number],
  seed: number,
): BassResult {
  const kicks = [...new Set(
    drums.hits.filter((hit) => hit.drum === "kick").map((hit) => hit.step),
  )].sort((left, right) => left - right);
  const onsetSet = new Set<number>();
  const exactKickSet = new Set(kicks);

  for (let index = 0; index < kicks.length; index++) {
    const kick = kicks[index];
    const selectionChance = section.type === "intro" ? 0.5 : section.type === "drop" ? 0.94 : 0.76;
    if (index === 0 || eventChance(seed, "bass:select-kick", kick) < selectionChance) {
      const responseChance = input.complexity >= 3
        ? (section.type === "intro" ? 0.08 : section.type === "drop" ? 0.28 : 0.18)
        : 0;
      const responseStep = kick + 1;
      const useResponse = responseStep < STEPS_PER_BAR
        && !exactKickSet.has(responseStep)
        && eventChance(seed, "bass:kick-response", kick) < responseChance;
      onsetSet.add(useResponse ? responseStep : kick);
    }
  }
  if (onsetSet.size === 0) onsetSet.add(kicks[0] ?? 0);

  // At higher complexity, reserve at least one call-and-response onset when
  // the real kick pattern leaves room. This avoids accidental 1:1 collision
  // while every bass decision still derives from an actually generated kick.
  if (input.complexity >= 3 && kicks.length > 1 && [...onsetSet].every((step) => exactKickSet.has(step))) {
    for (let index = kicks.length - 1; index >= 1; index--) {
      const responseStep = kicks[index] + 1;
      if (responseStep < STEPS_PER_BAR && !exactKickSet.has(responseStep)) {
        onsetSet.delete(kicks[index]);
        onsetSet.add(responseStep);
        break;
      }
    }
  }

  const onsets = [...onsetSet].sort((left, right) => left - right);
  const notes: BassNote[] = onsets.map((step, index) => {
    const nextStep = onsets[index + 1] ?? STEPS_PER_BAR;
    const maximumDuration = Math.max(1, nextStep - step);
    const desiredDuration = section.type === "intro" ? 3 : section.type === "drop" ? 1 : 2;
    const isResponse = !exactKickSet.has(step);
    return {
      step,
      note: chordPitch(plan, step, input.bassOctave),
      velocity: clampVelocity(82 + section.energy * 31 + eventChance(seed, "bass:velocity", step) * 8),
      duration: Math.min(desiredDuration, maximumDuration, STEPS_PER_BAR - step),
      slide: isResponse && input.complexity >= 3,
    };
  });

  return {
    engine: "bass",
    seed,
    style: input.bassStyle,
    bpm: input.bpm,
    key: input.key,
    scale: input.globalScale,
    octaveOffset: input.bassOctave,
    notes,
  };
}

function melodyFingerprint(block: ArrangementBlockData): string {
  return canonicalSerialize(block.melodyResults.map(({ layerId, result }) => ({
    layerId,
    notes: result.notes.map(({ step, note, duration }) => ({ step, note, duration })),
  })));
}

function scoreCandidate(
  blocks: ArrangementBlockData[],
  plan: CompositionPlan,
  input: ResolvedInput,
): number {
  let score = 0;
  const eventCounts = blocks.map((block) =>
    block.drums.hits.length
    + block.bass.notes.length
    + block.melodyResults.reduce((sum, layer) => sum + layer.result.notes.length, 0)
  );
  if (eventCounts[0] < eventCounts[1] && eventCounts[1] < eventCounts[2]) score += 24;
  if (blocks[0].energy < blocks[1].energy && blocks[1].energy < blocks[2].energy) score += 12;

  const sectionFingerprints = new Set(blocks.map(melodyFingerprint));
  score += sectionFingerprints.size * 6;

  let bassCount = 0;
  let coordinatedBass = 0;
  let harmonicBass = 0;
  const scaleIntervals = SCALES[input.globalScale].intervals;
  for (const block of blocks) {
    const kickSteps = new Set(
      block.drums.hits.filter((hit) => hit.drum === "kick").map((hit) => hit.step),
    );
    for (const note of block.bass.notes) {
      bassCount++;
      if (kickSteps.has(note.step) || kickSteps.has(note.step - 1)) coordinatedBass++;
      const region = plan.harmonicGrid.find((item) =>
        item.startStep <= note.step && note.step < item.endStep
      ) ?? plan.harmonicGrid[0];
      const degree = region?.chordDegrees[0] ?? 0;
      const expected = ((KEYS[input.key] + (scaleIntervals[degree % scaleIntervals.length] ?? 0)) % 12 + 12) % 12;
      if (((note.note % 12) + 12) % 12 === expected) harmonicBass++;
    }
  }
  if (bassCount > 0) {
    score += (coordinatedBass / bassCount) * 18;
    score += (harmonicBass / bassCount) * 18;
  }

  const dropKicks = new Set(
    blocks[2].drums.hits.filter((hit) => hit.drum === "kick").map((hit) => hit.step),
  );
  const profileKicks = STYLES[input.drumStyle].kick;
  score += profileKicks.filter((step) => dropKicks.has(step)).length * 1.5;
  const idealDropKickCount = Math.min(10, profileKicks.length + Math.ceil(input.complexity / 2));
  score += Math.max(0, 8 - Math.abs(dropKicks.size - idealDropKickCount) * 1.5);

  let jumpTotal = 0;
  let jumpCount = 0;
  for (const block of blocks) {
    for (const layer of block.melodyResults) {
      for (let index = 1; index < layer.result.notes.length; index++) {
        jumpTotal += Math.abs(
          layer.result.notes[index].note - layer.result.notes[index - 1].note,
        );
        jumpCount++;
      }
    }
  }
  if (jumpCount > 0) {
    const averageJump = jumpTotal / jumpCount;
    score += Math.max(0, 10 - Math.abs(4.5 - averageJump) * 1.5);
  }

  score += blocks.slice(0, -1).filter((block) =>
    block.drums.hits.some((hit) => hit.step === 15 && hit.roll)
  ).length * 2;

  const bounded = blocks.every((block) =>
    block.bass.notes.every((note) => note.step >= 0 && note.step + note.duration <= block.durationSteps)
    && block.drums.hits.every((hit) => hit.step >= 0 && hit.step < block.durationSteps)
    && block.melodyResults.every(({ result }) =>
      result.notes.every((note) => note.step >= 0 && note.step + note.duration <= block.durationSteps)
    )
  );
  if (bounded) score += 20;
  return Math.round(score * 1000) / 1000;
}

function buildCandidate(
  input: ResolvedInput,
  masterSeed: number,
  variationIndex: number,
  parametersHash: string,
  versions: CompositionVersions,
  attempt: number,
): Candidate {
  const { namespace, plan, planHash } = buildCandidateGenerationContext(
    input,
    masterSeed,
    variationIndex,
    parametersHash,
    versions,
    attempt,
  );

  const drumDnaSeed = deriveSeed(masterSeed, ...namespace, "track:drums", "groove-dna");
  const drumDna = buildDrumDna(input, plan, drumDnaSeed);
  const { melodyProfile } = extractProfiles(input);
  const melodyDna = input.melodyLayers.map((layer) => {
    const layerSeed = deriveSeed(
      masterSeed,
      ...namespace,
      `track:melody:${layer.id}`,
      "motif-dna",
    );
    return {
      layer,
      result: generateMelody({
        style: layer.style,
        bpm: input.bpm,
        key: input.key,
        scale: input.globalScale,
        complexity: input.complexity,
        seed: layerSeed,
        compositionPlan: plan,
        melodyProfile,
      }),
    };
  });

  const blocks = SECTION_SPECS.map((section, sectionIndex): ArrangementBlockData => {
    const sectionComplexity = clamp(
      input.complexity + section.complexityOffset,
      1,
      5,
    );
    const sectionInput = { ...input, complexity: sectionComplexity };
    const sectionSeed = deriveSeed(
      masterSeed,
      ...namespace,
      `section:${section.type}`,
    );
    const drums = shapeDrumsForSection(
      drumDna,
      sectionInput,
      section,
      deriveSeed(sectionSeed, "track:drums"),
    );
    const bass = buildCoordinatedBass(
      sectionInput,
      plan,
      drums,
      section,
      deriveSeed(sectionSeed, "track:bass", `depends-on:${drums.seed}`),
    );
    const melodyResults = melodyDna.map(({ layer, result }) => ({
      layerId: layer.id,
      result: shapeMelodyForSection(
        result,
        plan,
        sectionInput,
        section,
        deriveSeed(sectionSeed, `track:melody:${layer.id}`),
      ),
    }));

    return {
      id: `${section.type}-${hashHex(`${masterSeed}|${parametersHash}|${variationIndex}|${attempt}|${section.type}`)}`,
      type: section.type,
      startStep: sectionIndex * STEPS_PER_BAR,
      durationSteps: STEPS_PER_BAR,
      energy: section.energy,
      attempt,
      bass,
      drums,
      melodyResults,
    };
  });
  const timeline = buildCanonicalTimeline({
    bpm: input.bpm,
    blocks,
    melodyLayers: buildTimelineMelodyLayers(input),
  });
  return {
    attempt,
    blocks,
    planHash,
    timelineHash: timeline.timelineHash,
    timelineEndTick: timeline.arrangementEndTick,
    score: scoreCandidate(blocks, plan, input),
  };
}

interface SelectiveRegenerationBase {
  context: SelectiveGenerationContext;
  /** The resulting track exposes this normalized seed for exact replay. */
  seed: number;
}

export type SelectiveCompositionRegenerationRequest =
  | (SelectiveRegenerationBase & { track: "melody"; layerId: string })
  | (SelectiveRegenerationBase & { track: "bass" })
  | (SelectiveRegenerationBase & { track: "drums" });

export interface ContextualDrumRegenerationResult extends GenerateDrumsResponseData {
  dependentBass: BassResult;
}

interface ResolvedSelectiveContext {
  input: ResolvedInput;
  masterSeed: number;
  namespace: string[];
  plan: CompositionPlan;
  section: (typeof SECTION_SPECS)[number];
  sectionInput: ResolvedInput;
  sectionSeed: number;
}

function resolveSelectiveContext(
  context: SelectiveGenerationContext,
): ResolvedSelectiveContext {
  const input = resolveInput(context.composition);
  const identity = context.identity;
  const section = SECTION_SPECS.find((candidate) => candidate.type === context.block.type);
  if (!section) {
    throw new Error(`Unsupported selective section: ${context.block.type}`);
  }
  if (context.block.durationSteps !== STEPS_PER_BAR) {
    throw new Error(
      `Selective block ${context.block.id} must span ${STEPS_PER_BAR} steps`,
    );
  }
  if (context.block.attempt !== identity.attempt) {
    throw new Error("Selective context mixes blocks from a different candidate attempt");
  }

  const computedParametersHash = hashCompositionValue(buildParameterSnapshot(input));
  if (computedParametersHash !== identity.parametersHash) {
    throw new Error("Selective context parameters do not match the generated snapshot");
  }

  const masterSeed = resolveMasterSeed(identity.masterSeed);
  const versions: CompositionVersions = {
    schemaVersion: identity.schemaVersion,
    engineVersion: identity.engineVersion,
    presetVersion: identity.presetVersion,
  };
  const generationContext = buildCandidateGenerationContext(
    input,
    masterSeed,
    identity.variationIndex,
    identity.parametersHash,
    versions,
    identity.attempt,
  );
  if (generationContext.planHash !== identity.planHash) {
    throw new Error("Selective context cannot reproduce the canonical composition plan");
  }

  const sectionComplexity = clamp(
    input.complexity + section.complexityOffset,
    1,
    5,
  );
  const sectionInput = { ...input, complexity: sectionComplexity };
  const sectionSeed = deriveSeed(
    masterSeed,
    ...generationContext.namespace,
    `section:${section.type}`,
  );
  return {
    input,
    masterSeed,
    namespace: generationContext.namespace,
    plan: generationContext.plan,
    section,
    sectionInput,
    sectionSeed,
  };
}

export function regenerateCompositionTrack(
  request: SelectiveRegenerationBase & { track: "melody"; layerId: string },
): MelodyResult;
export function regenerateCompositionTrack(
  request: SelectiveRegenerationBase & { track: "bass" },
): BassResult;
export function regenerateCompositionTrack(
  request: SelectiveRegenerationBase & { track: "drums" },
): ContextualDrumRegenerationResult;
/**
 * Regenerates one track inside the selected candidate's immutable plan.
 * Drums declare bass as a dependent and therefore rebuild it atomically.
 */
export function regenerateCompositionTrack(
  request: SelectiveCompositionRegenerationRequest,
): MelodyResult | BassResult | ContextualDrumRegenerationResult {
  const resolved = resolveSelectiveContext(request.context);
  const seed = makeSeed(request.seed);

  if (request.track === "melody") {
    const layer = resolved.input.melodyLayers.find(
      (candidate) => candidate.id === request.layerId,
    );
    if (!layer) {
      throw new Error(`Unknown melody layer in selective context: ${request.layerId}`);
    }
    const dnaSeed = deriveSeed(
      resolved.masterSeed,
      ...resolved.namespace,
      `track:melody:${layer.id}`,
      "motif-dna",
    );
    const { melodyProfile } = extractProfiles(resolved.input);
    const dna = generateMelody({
      style: layer.style,
      bpm: resolved.input.bpm,
      key: resolved.input.key,
      scale: resolved.input.globalScale,
      complexity: resolved.input.complexity,
      seed: dnaSeed,
      compositionPlan: resolved.plan,
      melodyProfile,
    });
    return shapeMelodyForSection(
      dna,
      resolved.plan,
      resolved.sectionInput,
      resolved.section,
      seed,
    );
  }

  if (request.track === "bass") {
    return buildCoordinatedBass(
      resolved.sectionInput,
      resolved.plan,
      request.context.block.drums,
      resolved.section,
      seed,
    );
  }

  const drumDnaSeed = deriveSeed(
    resolved.masterSeed,
    ...resolved.namespace,
    "track:drums",
    "groove-dna",
  );
  const drumDna = buildDrumDna(resolved.input, resolved.plan, drumDnaSeed);
  const drums = shapeDrumsForSection(
    drumDna,
    resolved.sectionInput,
    resolved.section,
    seed,
  );
  const dependentBass = buildCoordinatedBass(
    resolved.sectionInput,
    resolved.plan,
    drums,
    resolved.section,
    deriveSeed(
      resolved.sectionSeed,
      "track:bass",
      `depends-on:${drums.seed}`,
    ),
  );
  return { ...drums, dependentBass };
}

/**
 * Pure, deterministic full-composition entry point used directly by the
 * studio worker. No fetch, clock, ambient entropy, cache, or mutable state is
 * consulted while composing the snapshot.
 */
export function generateFullComposition(
  options: FullCompositionOptions,
): GenerateAllResponseData {
  const input = resolveInput(options);
  const masterSeed = resolveMasterSeed(options.masterSeed ?? options.seed);
  const variationIndex = Math.max(0, Math.trunc(options.variationIndex ?? 0));
  const candidateCount = clamp(Math.trunc(options.candidateCount ?? 3), 1, 8);
  const versions = resolveVersions(options);
  const parameterSnapshot = buildParameterSnapshot(input);
  const parametersHash = options.parametersHash || hashCompositionValue(parameterSnapshot);
  const candidates = Array.from({ length: candidateCount }, (_, attempt) =>
    buildCandidate(
      input,
      masterSeed,
      variationIndex,
      parametersHash,
      versions,
      attempt,
    )
  );
  
  const selected = candidates.reduce((best, candidate) =>
    candidate.score > best.score ? candidate : best
  );
  const primaryStyle = resolvePrimaryStyle(input);
  const totalSteps = selected.blocks.reduce(
    (maximum, block) => Math.max(maximum, block.startStep + block.durationSteps),
    0,
  );
  const endTick = selected.timelineEndTick;
  const generationId = `composition-${hashHex([
    masterSeed,
    variationIndex,
    versions.engineVersion,
    parametersHash,
    selected.attempt,
    selected.timelineHash,
  ].join("|"))}`;

  return {
    blocks: selected.blocks,
    identity: {
      generationId,
      masterSeed: String(masterSeed),
      variationIndex,
      attempt: selected.attempt,
      candidateCount,
      schemaVersion: versions.schemaVersion,
      engineVersion: versions.engineVersion,
      presetVersion: versions.presetVersion,
      genreId: primaryStyle,
      styleId: primaryStyle,
      presetId: input.presetId ?? `${primaryStyle}:${input.bassStyle}:${input.drumStyle}`,
      parametersHash,
      planHash: selected.planHash,
      score: selected.score,
    },
    timeline: {
      ppq: PPQ,
      totalSteps,
      endTick,
      arrangementEndTick: endTick,
      hash: selected.timelineHash,
    },
  };
}
