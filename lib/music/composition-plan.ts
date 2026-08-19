<<<<<<< HEAD
import { makeSeed, pick, rng } from "./random.ts";
import type { GenerateOptions, ScaleId, StyleId } from "./types.ts";
import { GENRE_MELODY_PROFILES } from "../engines/melody-context.ts";

=======
import { pick, rng } from "./random.ts";
import { KEYS, SCALES, STYLES } from "./styles.ts";
import type { GenerateOptions, ScaleId, StyleId } from "./types.ts";
import { GENRE_MELODY_PROFILES, resolveChordToIntervals } from "../engines/melody-context.ts";
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2

export interface PatternTimeline {
  stepsPerBar: number;
  bars: number;
  totalSteps: number;
}

export interface HarmonicRegion {
  startStep: number;
  endStep: number;
  chordRoot: number;       // Root of the chord (0-11, relative to key root if you want absolute, or 0-based scale degree)
  chordDegrees: number[];  // Tones relative to scale
  label: string;           // e.g., "i", "iv"
}

export interface RhythmicAnchor {
  step: number;
  weight: number;          // Importance of this beat (0-1)
<<<<<<< HEAD
  type: "downbeat" | "backbeat" | "syncopation" | "pickup" | "ghost";
=======
  type: "downbeat" | "backbeat" | "syncopation" | "pickup";
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export interface CompositionPlan {
  seed: number;
  timeline: PatternTimeline;
  tempo: number;
  key: string;
  scale: ScaleId;
  style: StyleId;
  harmonicGrid: HarmonicRegion[];
  phraseBoundaries: number[];
  energyCurve: number[];
  rhythmicAnchors: RhythmicAnchor[];
}

/**
 * Builds a deterministic shared composition plan.
 * Serves as the single source of truth for Melody, Bass, and Drums.
 */
export function buildCompositionPlan(options: GenerateOptions, randomGen?: () => number): CompositionPlan {
<<<<<<< HEAD
  const seed = makeSeed(options.seed);
=======
  const seed = options.seed ?? Math.floor(Math.random() * 1000000);
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  const random = randomGen ?? rng(seed);

  // 1. Timeline (Default 16 steps for UI compatibility in Lote 2)
  const timeline: PatternTimeline = {
    stepsPerBar: 16,
    bars: 1,
    totalSteps: 16,
  };

  const styleId = options.style;
  const profile = GENRE_MELODY_PROFILES[styleId] ?? GENRE_MELODY_PROFILES["trap-br"];
  
  const scaleId = options.scale ?? "pentatonic-minor";
<<<<<<< HEAD
=======
  const scaleIntervals = options.scale 
    ? SCALES[scaleId]?.intervals ?? SCALES["pentatonic-minor"].intervals
    : STYLES[styleId]?.scale ?? SCALES["pentatonic-minor"].intervals;

>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  // 2. Harmonic Grid
  // Select a progression from the genre profile
  const progression = pick(random, profile.progressions);
  const harmonicGrid: HarmonicRegion[] = [];
  const stepsPerChord = timeline.totalSteps / progression.length; // usually 16 / 4 = 4 steps

  for (let i = 0; i < progression.length; i++) {
    const chord = progression[i];
    harmonicGrid.push({
      startStep: i * stepsPerChord,
      endStep: (i + 1) * stepsPerChord,
      chordRoot: chord.tones[0],
      chordDegrees: chord.tones,
      label: chord.label,
    });
  }

  // 3. Rhythmic Anchors
  // Map strong beats and expected syncopations based on genre
  const rhythmicAnchors: RhythmicAnchor[] = [];
  for (let step = 0; step < timeline.totalSteps; step++) {
    if (step % 16 === 0) {
      rhythmicAnchors.push({ step, weight: 1.0, type: "downbeat" });
    } else if (step % 16 === 8) {
      rhythmicAnchors.push({ step, weight: 0.9, type: "backbeat" });
    } else if (step % 16 === 4 || step % 16 === 12) {
      rhythmicAnchors.push({ step, weight: 0.7, type: "backbeat" });
    } else if (step % 2 !== 0 && random() < profile.syncopation) {
      rhythmicAnchors.push({ step, weight: 0.5, type: "syncopation" });
    }
  }

  // 4. Phrase Boundaries (e.g. 8 and 16)
  const phraseBoundaries = [8, 16];

  // 5. Energy Curve (e.g. slight rise at the end of the phrase for a fill)
  const energyCurve = Array.from({ length: timeline.totalSteps }, (_, i) => {
    // Base energy 0.5, rising to 0.8 at phrase boundaries
    if (i >= 12) return 0.8;
    return 0.5;
  });

  return {
    seed,
    timeline,
    tempo: options.bpm,
    key: options.key ?? "C",
    scale: scaleId,
    style: styleId,
    harmonicGrid,
    phraseBoundaries,
    energyCurve,
    rhythmicAnchors,
  };
}
