import { makeSeed } from "../music/random.ts";
import { STYLES } from "../music/styles.ts";
import type { DrumHit, DrumResult, DrumRoll, GenerateOptions, StyleId } from "../music/types.ts";

// Default Groove DNA per Genre
const GENRE_GROOVE_DNA: Record<
  StyleId,
  {
    defaultSwing: number;
    defaultRollDensity: number;
    defaultHumanize: number;
    favoredRollCount: 2 | 3 | 4 | 6;
    pitchDropProbability: number;
    swingOffsetMs: number;
  }
> = {
  "trap-br": {
    defaultSwing: 25,
    defaultRollDensity: 65,
    defaultHumanize: 50,
    favoredRollCount: 2, // 1/32 roll
    pitchDropProbability: 0.25,
    swingOffsetMs: 6,
  },
  "trap-uk": {
    defaultSwing: 40,
    defaultRollDensity: 80,
    defaultHumanize: 60,
    favoredRollCount: 3, // Triplet 1/24 & Sextuplets
    pitchDropProbability: 0.75, // Signature Drill Hat Drop
    swingOffsetMs: 10,
  },
  "trap-usa": {
    defaultSwing: 20,
    defaultRollDensity: 70,
    defaultHumanize: 45,
    favoredRollCount: 4, // 1/64 fast rolls & 1/32
    pitchDropProbability: 0.4,
    swingOffsetMs: 4,
  },
  "funk": {
    defaultSwing: 60,
    defaultRollDensity: 40,
    defaultHumanize: 70,
    favoredRollCount: 2,
    pitchDropProbability: 0.1,
    swingOffsetMs: 14,
  },
  "hip-hop": {
    defaultSwing: 55,
    defaultRollDensity: 30,
    defaultHumanize: 85,
    favoredRollCount: 2,
    pitchDropProbability: 0.05,
    swingOffsetMs: 12,
  },
  "amapiano": {
    defaultSwing: 50,
    defaultRollDensity: 60,
    defaultHumanize: 65,
    favoredRollCount: 3,
    pitchDropProbability: 0.2,
    swingOffsetMs: 10,
  },
};

/**
 * Deterministic PRNG based on seed, track name, step and sub-index.
 * Guarantees identical output across playback and WAV rendering.
 */
function deterministicRng(seed: number, track: string, step: number, subIndex = 0): number {
  let h = (seed ^ (step * 397) ^ (subIndex * 1009)) >>> 0;
  for (let i = 0; i < track.length; i++) {
    h = Math.imul(h ^ track.charCodeAt(i), 2246822507) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return (h >>> 0) / 4294967296;
}

export function generateDrums(options: GenerateOptions): DrumResult {
  const seed = makeSeed(options.seed);
  const preset = STYLES[options.style] ?? STYLES["trap-br"];
  const dna = GENRE_GROOVE_DNA[options.style] ?? GENRE_GROOVE_DNA["trap-br"];
  const hits: DrumHit[] = [];
  const comp = Math.min(5, Math.max(1, options.complexity || 3));
  const patternMode = options.drumPattern || "standard";

  // Effective groove parameters
  const effectiveSwing = options.swing !== undefined ? options.swing : dna.defaultSwing;
  const effectiveRolls = options.rollDensity !== undefined ? options.rollDensity : dna.defaultRollDensity;
  const effectiveHumanize = options.humanize !== undefined ? options.humanize : dna.defaultHumanize;

  const getMicroTiming = (drum: string, step: number) => {
    const isOffbeat = step % 2 === 1;
    // Main downbeats (0, 4, 8, 12) for kick/snare stay locked to grid to protect beat anchor
    if ((drum === "kick" || drum === "snare") && step % 4 === 0) {
      return 0;
    }
    const swingMs = isOffbeat ? dna.swingOffsetMs * (effectiveSwing / 50) : 0;
    const jitterFactor = deterministicRng(seed, `${drum}-jitter`, step) * 2 - 1;
    const humanizeJitter = jitterFactor * (effectiveHumanize / 100) * 3.5;
    // Strictly bound within [-15, +15] ms
    return Math.max(-15, Math.min(15, Math.round(swingMs + humanizeJitter)));
  };

  const getHumanizedVel = (drum: string, step: number, base: number) => {
    const velNoise = deterministicRng(seed, `${drum}-vel`, step) * 2 - 1;
    const range = (effectiveHumanize / 100) * 20;
    const offset = velNoise * range;
    // Bounded safely: never zero, max 127
    return Math.max(35, Math.min(127, Math.round(base + offset)));
  };

  const add = (
    step: number,
    drum: DrumHit["drum"],
    baseVel = 88,
    extra?: Partial<Omit<DrumHit, "step" | "drum" | "velocity">>
  ) => {
    hits.push({
      step,
      drum,
      velocity: getHumanizedVel(drum, step, baseVel),
      microTimingMs: getMicroTiming(drum, step),
      ...extra,
    });
  };

  // 1. Kick Pattern
  if (patternMode === "half-time") {
    add(0, "kick", 108);
    if (comp >= 2 && deterministicRng(seed, "kick-half-10", 10) > 0.35) add(10, "kick", 90);
    if (comp >= 4 && deterministicRng(seed, "kick-half-14", 14) > 0.5) add(14, "kick", 82);
  } else if (patternMode === "double-time") {
    [0, 3, 6, 8, 10, 14].forEach((step) => add(step, "kick", 96));
  } else if (options.style === "trap-uk") {
    add(0, "kick", 105);
    add(3, "kick", 92);
    if (deterministicRng(seed, "kick-drill-8", 8) > 0.3) add(8, "kick", 96);
    if (comp >= 3 && deterministicRng(seed, "kick-drill-11", 11) > 0.4) add(11, "kick", 88);
    if (comp >= 4 && deterministicRng(seed, "kick-drill-14", 14) > 0.5) add(14, "kick", 84);
  } else if (options.style === "funk") {
    [0, 4, 7, 10, 13].forEach((step) => {
      add(step, "kick", step === 0 ? 110 : 98);
    });
  } else {
    preset.kick.forEach((step) => {
      if (deterministicRng(seed, "kick-preset", step) < 0.82 + comp * 0.035) {
        add(step, "kick", step === 0 ? 108 : 95);
      }
    });
    if (comp >= 3) {
      const ghostSteps = [3, 11, 13];
      ghostSteps.forEach((step) => {
        if (deterministicRng(seed, "kick-ghost", step) < 0.25 + (comp - 3) * 0.25) add(step, "kick", 74);
      });
    }
  }

  // 2. Snare / Clap / Rim
  if (patternMode === "half-time") {
    add(8, "snare", 108);
    if (comp >= 3 && deterministicRng(seed, "snare-half-14", 14) > 0.45) add(14, "snare", 68);
  } else if (options.style === "trap-uk") {
    add(3, "snare", 92);
    add(8, "snare", 105);
    if (comp >= 3) add(11, "snare", 65);
    if (comp >= 4 && deterministicRng(seed, "snare-drill-15", 15) > 0.4) add(15, "snare", 72);
  } else {
    preset.snare.forEach((step) => add(step, "snare", 102));
    if (comp >= 3 && deterministicRng(seed, "snare-ghost-10", 10) > 0.4) {
      add(10, "snare", 58); // Ghost note
    }
    if (comp >= 4 && deterministicRng(seed, "snare-fill-14", 14) > 0.4) {
      add(14, "snare", 72);
      add(15, "snare", 88);
    }
  }

  // 3. Hi-Hats with Sub-Step Rolls & Parametric Pitch Curves
  const rollChanceThreshold = 1.0 - (effectiveRolls / 100) * 0.55;

  for (let s = 0; s < 16; s++) {
    const isStrongBeat = s % 4 === 0;
    const isOffbeat = s % 2 === 1;

    const isRollCandidate =
      options.style === "trap-uk"
        ? s === 3 || s === 7 || s === 11 || s === 15
        : s === 6 || s === 7 || s === 14 || s === 15 || s === 2 || s === 10;

    const rndRoll = deterministicRng(seed, "hat-roll-chance", s);
    const shouldRoll = isRollCandidate && comp >= 2 && rndRoll > rollChanceThreshold;

    if (shouldRoll) {
      const rollCount: 1 | 2 | 3 | 4 | 6 =
        options.style === "trap-uk" && deterministicRng(seed, "drill-triplet", s) > 0.35
          ? 3 // Triplet distributed across the step
          : dna.favoredRollCount;

      const hasPitchDrop = deterministicRng(seed, "pitch-drop", s) < dna.pitchDropProbability;
      const curve: "crescendo" | "decrescendo" | "flat" =
        deterministicRng(seed, "curve", s) > 0.5 ? "crescendo" : "decrescendo";

      const rollObj: DrumRoll = {
        count: rollCount,
        velocityCurve: curve,
        pitchCurve: hasPitchDrop
          ? {
              startCents: 600, // starts +6 semitones
              endCents: -600,  // drops -6 semitones
              durationMs: 80,
            }
          : undefined,
      };

      add(s, "hat", 80, { roll: rollObj });
    } else {
      const baseVel = isStrongBeat ? 86 : isOffbeat ? 72 : 64;
      if (options.style === "funk" || options.style === "amapiano") {
        if (s % 2 === 1) add(s, "hat", 80);
      } else {
        add(s, "hat", baseVel);
      }
    }
  }

  // 4. Open-Hat (Crashes / Accents)
  if (comp >= 2 && deterministicRng(seed, "open-hat-chance", 0) > 0.25) {
    const openSteps = options.style === "trap-uk" ? [2, 8, 14] : [2, 6, 10, 14];
    const pickIdx = Math.floor(deterministicRng(seed, "open-hat-step", 0) * openSteps.length);
    const chosen = openSteps[pickIdx];
    add(chosen, "open-hat", 88);
  }

  return {
    engine: "drums",
    seed,
    style: options.style,
    bpm: options.bpm,
    patternMode,
    hits: hits.sort((a, b) => a.step - b.step),
  };
}


