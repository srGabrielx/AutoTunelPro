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
  };
}
