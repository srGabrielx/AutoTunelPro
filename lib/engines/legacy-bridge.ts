<<<<<<< HEAD
import { generateBass } from "./bass.ts";
import { generateDrums } from "./drums.ts";
import type {
  BassNote,
  BassResult,
  DrumHit,
  DrumResult,
  GenerateOptions,
} from "../music/types.ts";
import { deriveSeed, makeSeed, rng } from "../music/random.ts";

const STEPS_PER_BAR = 16;

function clampVelocity(value: number): number {
  return Math.max(1, Math.min(127, Math.round(value)));
}

function normalizeBassNotes(notes: BassNote[]): BassNote[] {
  const monophonic = new Map<number, BassNote>();

  for (const note of notes) {
    if (!Number.isFinite(note.step) || !Number.isFinite(note.note)) continue;
    const step = Math.trunc(note.step);
    if (step < 0 || step >= STEPS_PER_BAR) continue;

    const normalized: BassNote = {
      ...note,
      step,
      note: Math.max(0, Math.min(127, Math.round(note.note))),
      velocity: clampVelocity(note.velocity),
      duration: Math.max(
        1,
        Math.min(STEPS_PER_BAR - step, Math.trunc(note.duration) || 1),
      ),
    };

    const previous = monophonic.get(step);
    if (!previous || normalized.velocity > previous.velocity) {
      monophonic.set(step, normalized);
    }
  }

  return [...monophonic.values()].sort((left, right) => left.step - right.step);
}

function applyPatternMode(
  hits: DrumHit[],
  options: GenerateOptions,
  seed: number,
): DrumHit[] {
  const pattern = options.drumPattern ?? "standard";
  const random = rng(deriveSeed(seed, "legacy-drums", pattern));
  let transformed = hits.map((hit) => ({ ...hit }));

  if (pattern === "half-time") {
    transformed = transformed.filter((hit) => {
      if (hit.drum === "snare" || hit.drum === "clap") return hit.step === 8;
      if (hit.drum === "kick") return hit.step === 0 || hit.step >= 8;
      return hit.step % 2 === 0;
    });
    if (!transformed.some((hit) =>
      hit.step === 8 && (hit.drum === "snare" || hit.drum === "clap")
    )) {
      transformed.push({ step: 8, drum: "snare", velocity: 108, microTimingMs: 0 });
    }
  } else if (pattern === "double-time") {
    for (const step of [4, 12]) {
      if (!transformed.some((hit) =>
        hit.step === step && (hit.drum === "snare" || hit.drum === "clap")
      )) {
        transformed.push({
          step,
          drum: "snare",
          velocity: clampVelocity(96 + random() * 16),
          microTimingMs: 0,
        });
      }
    }
  } else if (pattern === "triplet-rolls") {
    transformed = transformed.map((hit) => {
      if (hit.drum !== "hat" || hit.step % 2 === 0) return hit;
      return {
        ...hit,
        roll: hit.roll ?? { count: 3, velocityCurve: "decrescendo" },
      };
    });
  }

  return transformed;
}

function normalizeDrumHits(hits: DrumHit[]): DrumHit[] {
  const unique = new Map<string, DrumHit>();

  for (const hit of hits) {
    if (!Number.isFinite(hit.step)) continue;
    const step = Math.trunc(hit.step);
    if (step < 0 || step >= STEPS_PER_BAR) continue;

    const normalized: DrumHit = {
      ...hit,
      step,
      velocity: clampVelocity(hit.velocity),
      microTimingMs: hit.microTimingMs === undefined
        ? undefined
        : Math.max(-15, Math.min(15, Math.round(hit.microTimingMs))),
    };
    const key = `${step}:${normalized.drum}:${JSON.stringify(normalized.roll ?? null)}`;
    const previous = unique.get(key);
    if (!previous || normalized.velocity > previous.velocity) {
      unique.set(key, normalized);
    }
  }

  return [...unique.values()].sort((left, right) =>
    left.step - right.step || left.drum.localeCompare(right.drum)
  );
}

/**
 * Compatibility adapter for the one-bar API contract.
 *
 * The previous bridge invoked GENERATE_ARRANGEMENT for every API call and then
 * flattened a forty-bar state into a one-bar legacy result. The routes now use
 * the existing one-bar engines directly and enforce the adapter boundary.
 */
export async function runLegacyBassPipeline(
  options: GenerateOptions,
): Promise<BassResult> {
  const seed = makeSeed(options.seed);
  const result = generateBass({ ...options, seed });
  return { ...result, seed, notes: normalizeBassNotes(result.notes) };
}

export async function runLegacyDrumsPipeline(
  options: GenerateOptions,
): Promise<DrumResult> {
  const seed = makeSeed(options.seed);
  const result = generateDrums({ ...options, seed });
  const hits = normalizeDrumHits(applyPatternMode(result.hits, options, seed));
  return {
    ...result,
    seed,
    patternMode: options.drumPattern ?? "standard",
    hits,
=======
import { executeTransaction } from "../director/transactions/generation-transaction.ts";
import { getLegacyProfile } from "../director/context/resolver.ts";
import type { CompositionState } from "../core/state/composition.ts";
import type { GenerateOptions, BassResult, DrumResult, BassNote, DrumHit } from "../music/types.ts";
import { makeSeed } from "../music/random.ts";

function createInitialState(options: GenerateOptions, seedStr: string): CompositionState {
  const profile = getLegacyProfile(options.style);
  return {
    identity: {
      schemaVersion: "2" as any,
      engineVersion: "1" as any,
      presetVersion: "1" as any,
      generationId: `gen-${seedStr}`,
      masterSeed: seedStr,
      genreId: profile.genre || "trap",
      styleId: options.style,
      presetId: profile.id || options.style,
      parametersHash: seedStr,
    },
    context: {
      bpm: options.bpm || 120,
      key: options.key || "C",
      scale: options.scale || profile.harmonicProfile?.defaultScale || "natural-minor",
      energy: options.complexity ? options.complexity / 5 : 0.8,
      darkness: 0.5,
      complexity: options.complexity ? options.complexity / 5 : 0.5,
      density: 0.8,
      preset: profile,
      section: { id: "s1", type: "VERSE" as any, energyMultiplier: 1, densityMultiplier: 1 },
    },
    plan: {} as any,
    structure: { sections: [], totalTicks: 0 },
    layers: {
      melody: { events: [], variationIndex: 0 },
      harmony: { blocks: [], variationIndex: 0 },
      bass: { events: [], variationIndex: 0 },
      drums: { events: [], variationIndex: 0 },
    },
    memory: { motifs: [], phrases: [], sections: [], global: { motifsIntroduced: 0, motifsReused: 0 } },
    locks: { melody: false, harmony: false, bass: false, drums: false },
    metrics: { voiceLeadingScore: 1, harmonicCohesionScore: 1, rhythmicDensityScore: 1, violations: [], repairAttempts: 0, qualityStatus: "PRISTINE" },
    revision: 1,
  };
}

export async function runLegacyBassPipeline(options: GenerateOptions): Promise<BassResult> {
  const seed = makeSeed(options.seed);
  const state = createInitialState(options, seed.toString());

  const outcome = await executeTransaction(
    { type: "GENERATE_ARRANGEMENT", requestId: `req-${seed}`, expectedRevision: state.revision },
    state,
    ["arrangement", "harmony", "bass"],
    ["arrangement", "harmony", "bass"]
  );

  const bassEvents = outcome.state.layers.bass.events;

  // Convert to legacy notes format (ticks to steps)
  // 1 step = 1/16th note = 240 ticks
  const notes: BassNote[] = [];
  const noteOns = bassEvents.filter((e) => e.type === "NOTE_ON");

  for (const on of noteOns) {
    const step = Math.floor(on.tick / 240);
    // Find corresponding NOTE_OFF to get duration
    const off = bassEvents.find((e) => e.type === "NOTE_OFF" && e.note === on.note && e.tick > on.tick);
    const durationTicks = off ? off.tick - on.tick : 240;
    const durationSteps = Math.max(1, Math.floor(durationTicks / 240));

    notes.push({
      step,
      note: on.note,
      velocity: on.velocity || 100,
      duration: durationSteps,
      slide: false, // slide feature could be added to events payload if needed
    });
  }

  return {
    engine: "bass",
    seed,
    style: options.style,
    bpm: options.bpm || 120,
    key: options.key || "C",
    scale: options.scale || "natural-minor",
    octaveOffset: options.bassOctave || -24,
    notes: notes.sort((a, b) => a.step - b.step),
  };
}

export async function runLegacyDrumsPipeline(options: GenerateOptions): Promise<DrumResult> {
  const seed = makeSeed(options.seed);
  const state = createInitialState(options, seed.toString());

  const outcome = await executeTransaction(
    { type: "GENERATE_ARRANGEMENT", requestId: `req-${seed}`, expectedRevision: state.revision },
    state,
    ["arrangement", "drums"],
    ["arrangement", "drums"]
  );

  const drumsEvents = outcome.state.layers.drums.events;

  const hits: DrumHit[] = [];
  const noteOns = drumsEvents.filter((e) => e.type === "NOTE_ON");

  for (const on of noteOns) {
    const step = Math.floor(on.tick / 240);
    let instrument = "hat"; // default

    if (on.note === 36) instrument = "kick";
    else if (on.note === 38 || on.note === 39) instrument = "snare";
    else if (on.note === 42 || on.note === 46) instrument = "hat";
    else if (on.note === 60) instrument = "perc"; // or map custom

    hits.push({
      step,
      drum: instrument as any,
      velocity: on.velocity || 100,
    });
  }

  return {
    engine: "drums",
    seed,
    style: options.style,
    bpm: options.bpm || 120,
    hits: hits.sort((a, b) => a.step - b.step),
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  };
}
