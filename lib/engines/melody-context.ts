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
export const CHORD_i:   ChordDegrees = { tones: [0, 2, 4], label: "i" };
export const CHORD_ii:  ChordDegrees = { tones: [1, 3, 5], label: "ii" };
export const CHORD_III: ChordDegrees = { tones: [2, 4, 6], label: "III" };
export const CHORD_iv:  ChordDegrees = { tones: [3, 5, 0], label: "iv" };
export const CHORD_v:   ChordDegrees = { tones: [4, 6, 1], label: "v" };
export const CHORD_VI:  ChordDegrees = { tones: [5, 0, 2], label: "VI" };
export const CHORD_VII: ChordDegrees = { tones: [6, 1, 3], label: "VII" };

// 7th chords for deeper harmonic warmth and modern production
export const CHORD_i7:   ChordDegrees = { tones: [0, 2, 4, 6], label: "i7" };
export const CHORD_III7: ChordDegrees = { tones: [2, 4, 6, 1], label: "IIImaj7" };
export const CHORD_iv7:  ChordDegrees = { tones: [3, 5, 0, 2], label: "iv7" };
export const CHORD_VI7:  ChordDegrees = { tones: [5, 0, 2, 4], label: "VImaj7" };
export const CHORD_VII7: ChordDegrees = { tones: [6, 1, 3, 5], label: "VII7" };

// Pentatonic chords (5-note scales — degrees wrap at 5)
export const PENTA_i:   ChordDegrees = { tones: [0, 2, 4], label: "i" };
export const PENTA_ii:  ChordDegrees = { tones: [1, 3, 0], label: "ii" };
export const PENTA_III: ChordDegrees = { tones: [2, 4, 1], label: "III" };
export const PENTA_iv:  ChordDegrees = { tones: [3, 0, 2], label: "iv" };
export const PENTA_v:   ChordDegrees = { tones: [4, 1, 3], label: "v" };

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
      [CHORD_i, CHORD_VI, CHORD_III, CHORD_VII],   // i - VI - III - VII (classic commercial trap)
      [CHORD_i, CHORD_iv, CHORD_VI, CHORD_v],      // i - iv - VI - v (emotional dark trap)
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],      // i - VI - iv - v (Matuê / Teto style)
      [CHORD_i, CHORD_VII, CHORD_VI, CHORD_VII],   // i - VII - VI - VII (tension loop)
    ],
    motifLengths: [3, 4],
    restProbability: 0.2,
    maxJump: 7,
    registerRange: [-12, 12],
    syncopation: 0.35,
    durations: [1, 2],
    longNoteProbability: 0.35,
  },
  "trap-uk": {
    progressions: [
      [CHORD_i, CHORD_VI, CHORD_v, CHORD_i],       // UK Drill dark loop
      [CHORD_i, CHORD_iv, CHORD_v, CHORD_i],       // Dark drill progression
      [CHORD_i, CHORD_VII, CHORD_VI, CHORD_v],     // Descending tension loop
      [CHORD_i, CHORD_III, CHORD_VII, CHORD_iv],   // Minor pull
    ],
    motifLengths: [2, 3],
    restProbability: 0.25,
    maxJump: 5,
    registerRange: [-12, 12],
    syncopation: 0.45,
    durations: [1, 2],
    longNoteProbability: 0.25,
  },
  "trap-usa": {
    progressions: [
      [CHORD_i, CHORD_VI, CHORD_III, CHORD_VII],   // Metro Boomin / Travis Scott
      [CHORD_i, CHORD_iv, CHORD_III, CHORD_VI],    // Lil Baby / Gunna
      [CHORD_VI, CHORD_VII, CHORD_i, CHORD_i],     // Epic build up
      [CHORD_i, CHORD_iv, CHORD_VI, CHORD_v],      // Emotional Trap
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
      [CHORD_i, CHORD_iv, CHORD_VII, CHORD_III],   // Circle of 5ths classic boom bap
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],      // Soulful 90s
      [CHORD_ii, CHORD_v, CHORD_i, CHORD_VI],      // Jazz 2-5-1 minor
    ],
    motifLengths: [4, 3],
    restProbability: 0.3,
    maxJump: 5,
    registerRange: [-12, 12],
    syncopation: 0.5,
    durations: [1, 3],
    longNoteProbability: 0.4,
  },
  "funk": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_i, CHORD_iv],       // Funk repetitive groove
      [CHORD_i, CHORD_VII, CHORD_iv, CHORD_i],      // Funk BR
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
      [CHORD_i, CHORD_iv, CHORD_v, CHORD_iv],       // Circular groove
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],       // Uplifting
      [CHORD_i, CHORD_III, CHORD_iv, CHORD_v],      // Jazz amapiano
    ],
    motifLengths: [3, 4],
    restProbability: 0.25,
    maxJump: 7,
    registerRange: [0, 12],
    syncopation: 0.4,
    durations: [1, 2],
    longNoteProbability: 0.35,
  },
  "reggae-default": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_i, CHORD_iv],       // Reggae one drop
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],       // Roots
      [CHORD_i, CHORD_v, CHORD_iv, CHORD_v],        // Dub
    ],
    motifLengths: [2, 4],
    restProbability: 0.35,
    maxJump: 5,
    registerRange: [0, 12],
    syncopation: 0.8,
    durations: [1, 2],
    longNoteProbability: 0.5,
  },
  "boombap-default": {
    progressions: [
      [CHORD_i, CHORD_iv, CHORD_VII, CHORD_III],   // Jazzy circle of fifths
      [CHORD_ii, CHORD_v, CHORD_i, CHORD_VI],      // 2-5-1
      [CHORD_i, CHORD_VI, CHORD_iv, CHORD_v],      // Golden era
    ],
    motifLengths: [4, 3],
    restProbability: 0.3,
    maxJump: 6,
    registerRange: [-12, 12],
    syncopation: 0.5,
    durations: [1, 3],
    longNoteProbability: 0.4,
  },
  "hiphop-default": {
    progressions: [
      [CHORD_i, CHORD_VI, CHORD_III, CHORD_VII],
      [CHORD_i, CHORD_iv, CHORD_VI, CHORD_v],
      [CHORD_i, CHORD_VII, CHORD_iv, CHORD_VI],
    ],
    motifLengths: [3, 4],
    restProbability: 0.25,
    maxJump: 7,
    registerRange: [-12, 12],
    syncopation: 0.4,
    durations: [1, 2],
    longNoteProbability: 0.35,
  },
  "dubstep-default": {
    progressions: [
      [CHORD_i, CHORD_i, CHORD_VI, CHORD_VII],
      [CHORD_i, CHORD_v, CHORD_VI, CHORD_iv],
      [CHORD_i, CHORD_iv, CHORD_v, CHORD_i],
    ],
    motifLengths: [2, 4],
    restProbability: 0.2,
    maxJump: 12,
    registerRange: [-24, 0],
    syncopation: 0.7,
    durations: [2, 4],
    longNoteProbability: 0.6,
  },
};

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
