import { makeSeed } from "../music/random.ts";
import { STYLES } from "../music/styles.ts";
import type { DrumHit, DrumResult, DrumRoll, GenerateOptions, StyleId } from "../music/types.ts";
import { buildCompositionPlan, type CompositionPlan } from "../music/composition-plan.ts";

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
  
  // Create or reuse the composition plan
  const plan: CompositionPlan = options.compositionPlan ?? buildCompositionPlan(options, () => deterministicRng(seed, "plan", 0));

  // Effective groove parameters
  const effectiveSwing = options.swing !== undefined ? options.swing : dna.defaultSwing;
  const effectiveRolls = options.rollDensity !== undefined ? options.rollDensity : dna.defaultRollDensity;
  const effectiveHumanize = options.humanize !== undefined ? options.humanize : dna.defaultHumanize;

  const getMicroTiming = (drum: string, step: number) => {
    const isOffbeat = step % 2 === 1;
    if ((drum === "kick" || drum === "snare") && step % 4 === 0) {
      return 0;
    }
    const swingMs = isOffbeat ? dna.swingOffsetMs * (effectiveSwing / 50) : 0;
    const jitterFactor = deterministicRng(seed, `${drum}-jitter`, step) * 2 - 1;
    const humanizeJitter = jitterFactor * (effectiveHumanize / 100) * 3.5;
    return Math.max(-15, Math.min(15, Math.round(swingMs + humanizeJitter)));
  };

  const getHumanizedVel = (drum: string, step: number, base: number) => {
    const velNoise = deterministicRng(seed, `${drum}-vel`, step) * 2 - 1;
    const range = (effectiveHumanize / 100) * 20;
    const offset = velNoise * range;
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

  for (let bar = 0; bar < plan.timeline.bars; bar++) {
    const barStart = bar * plan.timeline.stepsPerBar;
    
    // 1. Snare / Clap Placement (Backbeats)
    const preferClap = options.style === "trap-br" || options.style === "trap-usa";
    const mainSnareDrum: DrumHit["drum"] = preferClap && deterministicRng(seed, "prefer-clap", 0) > 0.3 ? "clap" : "snare";

    plan.rhythmicAnchors
      .filter(a => a.step >= barStart && a.step < barStart + plan.timeline.stepsPerBar && a.type === "backbeat")
      .forEach(anchor => {
        add(anchor.step, mainSnareDrum, 104);
        
        // Layer snare + clap on strongest backbeats
        if (anchor.weight >= 0.9 && comp >= 3 && deterministicRng(seed, "layer-clap", anchor.step) > 0.4) {
          add(anchor.step, "clap", 92);
        }
      });
      
    // 2. Kick Placement (Downbeats and Syncopations)
    plan.rhythmicAnchors
      .filter(a => a.step >= barStart && a.step < barStart + plan.timeline.stepsPerBar && (a.type === "downbeat" || a.type === "syncopation"))
      .forEach(anchor => {
        if (anchor.type === "downbeat") {
          add(anchor.step, "kick", 108);
        } else if (anchor.type === "syncopation" && deterministicRng(seed, "kick-sync", anchor.step) < anchor.weight * (comp / 2)) {
          add(anchor.step, "kick", 85 + (anchor.weight * 10));
        }
      });

    // 3. Hi-Hats with Rolls obeying Energy Curve
    const rollChanceThreshold = 1.0 - (effectiveRolls / 100) * 0.55;

    for (let s = barStart; s < barStart + plan.timeline.stepsPerBar; s++) {
      const isStrongBeat = s % 4 === 0;
      const isOffbeat = s % 2 === 1;
      
      const energy = plan.energyCurve[s] ?? 0.5;
      
      // Determine base hat type
      const isTrap = options.style.startsWith("trap");
      const isOpenHatAcc = !isTrap && isOffbeat && deterministicRng(seed, "openhat-acc", s) > 0.6;
      let hatType: DrumHit["drum"] = isOpenHatAcc ? "open-hat" : "hat";
      
      // Trap often places open hats on specific beats
      if (isTrap && s % 8 === 6 && deterministicRng(seed, "trap-openhat", s) > 0.3) {
        hatType = "open-hat";
      }
      
      // Should we roll? Only if energy is high enough and not on a downbeat (usually)
      // The lower the energy, the lower the chance of rolling
      const dynamicRollChance = rollChanceThreshold + ( (0.8 - energy) * 0.5 ); 
      let roll: DrumRoll | undefined = undefined;
      let stepVel = isStrongBeat ? 95 : (isOffbeat ? 75 : 85);
      
      if (hatType === "hat" && !isStrongBeat && comp >= 3) {
        if (deterministicRng(seed, "hat-roll", s) > dynamicRollChance) {
          const rollCount = deterministicRng(seed, "roll-count", s) > 0.4 ? dna.favoredRollCount : 2;
          const appliesPitchDrop = deterministicRng(seed, "pitch-drop", s) < dna.pitchDropProbability;
          
          let pitchCurve = undefined;
          if (appliesPitchDrop && rollCount >= 3) {
            pitchCurve = {
              startCents: 0,
              endCents: -500, // Drop 5 semitones over the roll
              durationMs: 150
            };
          }

          roll = {
            count: rollCount,
            pitchCurve,
            velocityCurve: "flat"
          };
          stepVel += 15; // Accent the start of a roll
        }
      }
      
      // Determine if we play a hat here at all
      let playHat = true;
      if (options.style === "amapiano" && s % 4 !== 0 && deterministicRng(seed, "ama-hat-skip", s) > 0.3) {
        playHat = false; // Sparsity
      }
      if (options.style === "funk" && deterministicRng(seed, "funk-hat-skip", s) > 0.6) {
        playHat = false;
      }
      
      if (playHat) {
        add(s, hatType, stepVel, roll ? { roll } : undefined);
      }
    }
  }

  return {
    engine: "drums",
    seed,
    style: options.style,
    bpm: options.bpm,
    hits: hits.sort((a, b) => a.step - b.step),
  };
}
