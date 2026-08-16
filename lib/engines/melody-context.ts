/**
 * Melody Musical Context — Chord progressions, phrase structures, and
 * genre-specific parameters for the melody pipeline.
 *
 * This module provides the harmonic foundation that the melody pipeline
 * uses to generate musically coherent melodies. Each genre has its own
 * set of common chord progressions expressed as scale-degree triads.
 */

import type { ScaleId, StyleId } from "../music/types.ts";

// ============================================================
// CHORD PROGRESSIONS BY GENRE
// ============================================================

/**
 * A chord is represented as an array of scale-degree indices (0-based into
 * the scale intervals array). For example, in a 7-note scale [0,2,3,5,7,8,10]:
 *   degree 0 = root (interval 0)
 *   degree 2 = third (interval 3 in natural minor)
 *   degree 4 = fifth (interval 7)
 *
 * A progression is 4 chords, one per beat (4 steps each in a 16-step bar).
 */
export interface ChordDegrees {
  /** Scale degree indices that form this chord (0-based into scale intervals) */
  tones: number[];
  /** Label for debugging */
  label: string;
}

export interface GenreMelodyProfile {
  /** Common chord progressions (each is 4 chords for a 16-step bar) */
  progressions: ChordDegrees[][];
  /** Preferred motif lengths (in steps) */
  motifLengths: number[];
  /** Probability of rest on a non-strong beat (0-1) */
  restProbability: number;
  /** Maximum melodic jump in semitones between consecutive notes */
  maxJump: number;
  /** Preferred octave offset range [min, max] relative to root */
  registerRange: [number, number];
  /** How much rhythmic syncopation (0-1) */
  syncopation: number;
  /** Preferred note durations [short, long] in steps */
  durations: [number, number];
  /** Probability of using the longer duration */
  longNoteProbability: number;
}

// Scale degree chord definitions (relative to scale intervals array)
// For a 7-note scale: i=0, ii=1, III=2, iv=3, v=4, VI=5, VII=6
// For pentatonic (5 notes): adjusted accordingly
const CHORD_i:   ChordDegrees = { tones: [0, 2, 4], label: "i" };
const CHORD_ii:  ChordDegrees = { tones: [1, 3, 5], label: "ii" };
const CHORD_III: ChordDegrees = { tones: [2, 4, 6], label: "III" };
const CHORD_iv:  ChordDegrees = { tones: [3, 5, 0], label: "iv" };
const CHORD_v:   ChordDegrees = { tones: [4, 6, 1], label: "v" };
const CHORD_VI:  ChordDegrees = { tones: [5, 0, 2], label: "VI" };
const CHORD_VII: ChordDegrees = { tones: [6, 1, 3], label: "VII" };

// Pentatonic chords (5-note scales — degrees wrap at 5)
const PENTA_i:   ChordDegrees = { tones: [0, 2, 4], label: "i" };
const PENTA_ii:  ChordDegrees = { tones: [1, 3, 0], label: "ii" };
const PENTA_III: ChordDegrees = { tones: [2, 4, 1], label: "III" };
const PENTA_iv:  ChordDegrees = { tones: [3, 0, 2], label: "iv" };
const PENTA_v:   ChordDegrees = { tones: [4, 1, 3], label: "v" };

/**
 * Returns whether a scale is pentatonic (5 notes) or heptatonic (7 notes).
 */
export function getScaleSize(scaleId: ScaleId): number {
  const pentaScales: ScaleId[] = ["pentatonic-minor", "pentatonic-major"];
  return pentaScales.includes(scaleId) ? 5 : scaleId === "blues" ? 6 : 7;
}

export const GENRE_MELODY_PROFILES: Record<StyleId, GenreMelodyProfile> = {
  "trap-br": {
    progressions: [
      [CHORD_i, CHORD_VI, CHORD_III, CHORD_VII],   // i - VI - III - VII (classic trap)
      [CHORD_i, CHORD_iv, CHORD_VII, CHORD_III],    // i - iv - VII - III (dark)
      [CHORD_i, CHORD_v, CHORD_VI, CHORD_iv],       // i - v - VI - iv (emotional)
    ],
    motifLengths: [3, 4],
    restProbability: 0.25,
    maxJump: 7,
    registerRange: [-12, 12],
    syncopation: 0.35,
    durations: [1, 2],
    longNoteProbability: 0.3,
  },
  "trap-uk": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_v, CHORD_iv],       // Dark drill progression
      [CHORD_i, CHORD_VII, CHORD_VI, CHORD_VII],    // Tension loop
      [CHORD_i, CHORD_III, CHORD_VII, CHORD_iv],    // Minor pull
    ],
    motifLengths: [2, 3],
    restProbability: 0.3,
    maxJump: 5,
    registerRange: [-12, 12],
    syncopation: 0.45,
    durations: [1, 2],
    longNoteProbability: 0.25,
  },
  "trap-usa": {
    progressions: [
      [CHORD_i, CHORD_VI, CHORD_III, CHORD_VII],
      [CHORD_i, CHORD_iv, CHORD_VI, CHORD_v],
      [CHORD_i, CHORD_VII, CHORD_iv, CHORD_VI],
    ],
    motifLengths: [3, 4],
    restProbability: 0.2,
    maxJump: 7,
    registerRange: [-12, 12],
    syncopation: 0.3,
    durations: [1, 2],
    longNoteProbability: 0.35,
  },
  "hip-hop": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_i, CHORD_v],        // Classic boom bap
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],       // Soulful
      [CHORD_ii, CHORD_v, CHORD_i, CHORD_iv],       // Jazz influence
    ],
    motifLengths: [4, 3],
    restProbability: 0.35,
    maxJump: 5,
    registerRange: [-12, 12],
    syncopation: 0.5,
    durations: [1, 3],
    longNoteProbability: 0.4,
  },
  "funk": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_i, CHORD_iv],       // Funk repetitive groove
      [CHORD_i, CHORD_VII, CHORD_iv, CHORD_i],      // Funk br
      [CHORD_i, CHORD_v, CHORD_iv, CHORD_i],        // Tamborzão funk
    ],
    motifLengths: [2, 3],
    restProbability: 0.2,
    maxJump: 5,
    registerRange: [0, 12],
    syncopation: 0.6,
    durations: [1, 1],
    longNoteProbability: 0.15,
  },
  "amapiano": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_v, CHORD_i],        // Circular groove
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],       // Uplifting
      [CHORD_i, CHORD_III, CHORD_iv, CHORD_v],      // Jazz amapiano
    ],
    motifLengths: [3, 4],
    restProbability: 0.3,
    maxJump: 7,
    registerRange: [0, 12],
    syncopation: 0.4,
    durations: [1, 2],
    longNoteProbability: 0.35,
  },
};

// Fix reference: CHORD_IV doesn't exist, use CHORD_iv
// The amapiano profile references it - it's actually the same as iv in minor context

/**
 * Resolves chord degree indices to actual semitone intervals from the root,
 * handling pentatonic/blues/heptatonic scale sizes via modular wrapping.
 */
export function resolveChordToIntervals(
  chord: ChordDegrees,
  scaleIntervals: number[],
): number[] {
  const size = scaleIntervals.length;
  return chord.tones.map((degree) => {
    const wrappedDegree = ((degree % size) + size) % size;
    return scaleIntervals[wrappedDegree];
  });
}
