/**
 * Melody Pipeline — Structured, musically coherent melody generation.
 *
 * This module implements a multi-stage pipeline that transforms raw parameters
 * into melodies with harmonic awareness, motif development, voice leading,
 * and phrasing. It composes ON TOP of the existing engine — the output format
 * is identical to the original `MelodyResult`.
 *
 * Pipeline stages:
 *  1. Musical context creation (root, scale, chord progression)
 *  2. Motif generation (2-4 note rhythmic/melodic seed)
 *  3. Phrase construction (motif + variations across 4 beats)
 *  4. Voice leading & register correction
 *  5. Rhythmic refinement (rests, durations, syncopation)
 *  6. Deterministic humanization (velocity variation)
 *  7. Final validation (scale membership, register bounds)
 */

import { rng, pick } from "../music/random.ts";
import { KEYS, SCALES, STYLES } from "../music/styles.ts";
import type { GenerateOptions, MelodyNote, ScaleId, StyleId } from "../music/types.ts";
import {
  GENRE_MELODY_PROFILES,
  resolveChordToIntervals,
  type ChordDegrees,
  type GenreMelodyProfile,
} from "./melody-context.ts";

// ============================================================
// INTERNAL TYPES
// ============================================================

interface MotifNote {
  /** Offset in steps from phrase start */
  offset: number;
  /** Scale degree index (0-based into scaleIntervals) */
  degree: number;
  /** Duration in steps */
  duration: number;
}

interface PipelineContext {
  root: number;
  scaleIntervals: number[];
  scaleSize: number;
  profile: GenreMelodyProfile;
  complexity: number;
  random: () => number;
  style: StyleId;
}

// ============================================================
// STAGE 1: CREATE MUSICAL CONTEXT
// ============================================================

function createContext(
  options: GenerateOptions,
  random: () => number,
): PipelineContext {
  const preset = STYLES[options.style] ?? STYLES["trap-br"];
  const root = KEYS[options.key || "C"] ?? 60;
  const comp = Math.min(5, Math.max(1, options.complexity || 3));

  const scaleIntervals =
    options.scale && SCALES[options.scale]
      ? SCALES[options.scale].intervals
      : preset.scale;

  return {
    root,
    scaleIntervals,
    scaleSize: scaleIntervals.length,
    profile: GENRE_MELODY_PROFILES[options.style] ?? GENRE_MELODY_PROFILES["trap-br"],
    complexity: comp,
    random,
    style: options.style,
  };
}

// ============================================================
// STAGE 2: SELECT CHORD PROGRESSION
// ============================================================

function selectProgression(ctx: PipelineContext): ChordDegrees[] {
  const progressions = ctx.profile.progressions;
  return pick(ctx.random, progressions);
}

// ============================================================
// STAGE 3: GENERATE MOTIF
// ============================================================

/**
 * Creates a short melodic seed (motif) of 2-4 notes.
 * The motif uses chord tones of the first chord and stepwise motion.
 */
function generateMotif(ctx: PipelineContext, chordTones: number[]): MotifNote[] {
  const motifLength = pick(ctx.random, ctx.profile.motifLengths);
  const motif: MotifNote[] = [];

  // Start on a chord tone
  let currentDegree = chordTones[Math.floor(ctx.random() * chordTones.length)];

  for (let i = 0; i < motifLength; i++) {
    const offset = i * (ctx.random() > ctx.profile.syncopation ? 2 : 1);
    const duration = ctx.random() > ctx.profile.longNoteProbability
      ? ctx.profile.durations[0]
      : ctx.profile.durations[1];

    motif.push({
      offset: Math.min(offset, 3), // keep within a beat
      degree: currentDegree,
      duration,
    });

    // Move to next note: prefer stepwise motion (±1 degree)
    const direction = ctx.random() > 0.5 ? 1 : -1;
    const stepSize = ctx.random() > 0.7 ? 2 : 1; // occasional skip
    currentDegree = ((currentDegree + direction * stepSize) % ctx.scaleSize + ctx.scaleSize) % ctx.scaleSize;
  }

  return motif;
}

// ============================================================
// STAGE 4: DEVELOP MOTIF INTO PHRASES
// ============================================================

/**
 * Takes the motif and develops it across 4 beats (phrases), applying
 * variation techniques: transposition, inversion, rhythmic shift, omission.
 */
function developPhrases(
  ctx: PipelineContext,
  motif: MotifNote[],
  progression: ChordDegrees[],
): MelodyNote[] {
  const notes: MelodyNote[] = [];
  const beatsPerBar = 4;
  const stepsPerBeat = 4;

  for (let beat = 0; beat < beatsPerBar; beat++) {
    const beatStart = beat * stepsPerBeat;
    const chord = progression[beat];
    const chordIntervals = resolveChordToIntervals(chord, ctx.scaleIntervals);

    // Determine variation type for this beat
    const variationType = ctx.random();

    for (let i = 0; i < motif.length; i++) {
      const motifNote = motif[i];

      // Apply rest probability (don't rest on beat 0 of the first beat)
      if (beat > 0 && i > 0 && ctx.random() < ctx.profile.restProbability) {
        continue;
      }

      // Calculate step position
      let step = beatStart + motifNote.offset;
      if (step >= 16) continue;

      // Skip if we already have a note on this step
      if (notes.some((n) => n.step === step)) {
        step += 1;
        if (step >= 16 || notes.some((n) => n.step === step)) continue;
      }

      // Determine the actual degree based on variation
      let degree = motifNote.degree;

      if (variationType < 0.3) {
        // Transposition: shift motif degrees to fit current chord
        const chordRoot = chord.tones[0];
        const motifRoot = progression[0].tones[0];
        const shift = chordRoot - motifRoot;
        degree = ((degree + shift) % ctx.scaleSize + ctx.scaleSize) % ctx.scaleSize;
      } else if (variationType < 0.55) {
        // Inversion: reverse the melodic direction
        const centerDegree = motif[0].degree;
        const originalOffset = motifNote.degree - centerDegree;
        degree = ((centerDegree - originalOffset) % ctx.scaleSize + ctx.scaleSize) % ctx.scaleSize;
      } else if (variationType < 0.75) {
        // Chord tone substitution on strong positions
        if (i === 0 || step % 4 === 0) {
          // Use a chord tone of the current chord
          degree = chord.tones[Math.floor(ctx.random() * chord.tones.length)];
        }
      }
      // else: exact repetition of original motif

      // Strong beats (step 0, 4, 8, 12) should prefer chord tones
      const isStrongBeat = step % 4 === 0;
      if (isStrongBeat && ctx.random() > 0.3) {
        // Snap to nearest chord tone
        degree = findNearestChordTone(degree, chord.tones, ctx.scaleSize);
      }

      // Convert degree to MIDI note
      const interval = ctx.scaleIntervals[degree % ctx.scaleSize];

      // Octave placement based on register range and contour
      const octaveOffset = selectOctave(ctx, beat, i);
      const midiNote = ctx.root + interval + octaveOffset;

      // Duration
      const duration = motifNote.duration;

      // Base velocity with beat emphasis
      const baseVelocity = isStrongBeat ? 95 : (step % 2 === 0 ? 85 : 75);

      notes.push({
        step,
        note: midiNote,
        velocity: baseVelocity,
        duration,
      });
    }

    // Add a passing tone on weak beats for higher complexity
    if (ctx.complexity >= 4 && ctx.random() > 0.5) {
      const weakStep = beatStart + (ctx.random() > 0.5 ? 1 : 3);
      if (weakStep < 16 && !notes.some((n) => n.step === weakStep)) {
        // Passing tone: use a non-chord scale degree
        const passingDegree = Math.floor(ctx.random() * ctx.scaleSize);
        const passingInterval = ctx.scaleIntervals[passingDegree];
        const octave = selectOctave(ctx, beat, 0);
        notes.push({
          step: weakStep,
          note: ctx.root + passingInterval + octave,
          velocity: 70,
          duration: 1,
        });
      }
    }
  }

  return notes;
}

// ============================================================
// STAGE 5: VOICE LEADING & REGISTER CORRECTION
// ============================================================

/**
 * Corrects large melodic jumps and enforces register limits.
 */
function applyVoiceLeading(notes: MelodyNote[], ctx: PipelineContext): MelodyNote[] {
  if (notes.length < 2) return notes;

  // Sort by step first
  const sorted = [...notes].sort((a, b) => a.step - b.step);

  // Enforce register limits (MIDI 48-84 for most instruments)
  const minMidi = ctx.root + ctx.profile.registerRange[0];
  const maxMidi = ctx.root + ctx.profile.registerRange[1];
  const safeMin = Math.max(36, minMidi);
  const safeMax = Math.min(96, maxMidi);

  for (let i = 0; i < sorted.length; i++) {
    // Clamp to register
    while (sorted[i].note < safeMin) sorted[i] = { ...sorted[i], note: sorted[i].note + 12 };
    while (sorted[i].note > safeMax) sorted[i] = { ...sorted[i], note: sorted[i].note - 12 };

    // Voice leading: limit jump to maxJump semitones
    if (i > 0) {
      const prev = sorted[i - 1].note;
      let jump = Math.abs(sorted[i].note - prev);
      if (jump > ctx.profile.maxJump) {
        // First try octave shifts
        let candidate = sorted[i].note;
        while (Math.abs(candidate - prev) > ctx.profile.maxJump) {
          if (candidate > prev && candidate - 12 >= safeMin) {
            candidate -= 12;
          } else if (candidate < prev && candidate + 12 <= safeMax) {
            candidate += 12;
          } else {
            break;
          }
        }

        // If still exceeding maxJump, snap candidate to nearest valid scale note within maxJump distance
        if (Math.abs(candidate - prev) > ctx.profile.maxJump) {
          let best = candidate;
          let bestDiff = Infinity;
          for (let oct = -2; oct <= 4; oct++) {
            for (const inter of ctx.scaleIntervals) {
              const pitch = ctx.root + inter + oct * 12;
              if (pitch >= safeMin && pitch <= safeMax && Math.abs(pitch - prev) <= ctx.profile.maxJump) {
                const diff = Math.abs(pitch - candidate);
                if (diff < bestDiff) {
                  bestDiff = diff;
                  best = pitch;
                }
              }
            }
          }
          candidate = best;
        }

        sorted[i] = { ...sorted[i], note: candidate };
      }
    }
  }

  return sorted;
}

// ============================================================
// STAGE 6: HUMANIZE VELOCITY (DETERMINISTIC)
// ============================================================

function humanizeVelocity(notes: MelodyNote[], random: () => number): MelodyNote[] {
  return notes.map((note) => {
    const variation = Math.round((random() * 2 - 1) * 12);
    const velocity = Math.max(55, Math.min(120, note.velocity + variation));
    return { ...note, velocity };
  });
}

// ============================================================
// STAGE 7: VALIDATE
// ============================================================

/**
 * Ensures all notes belong to the scale (allowing chromatic passing tones
 * within ±1 semitone on weak beats only).
 */
function validateNotes(notes: MelodyNote[], ctx: PipelineContext): MelodyNote[] {
  const scaleSet = new Set<number>();
  // Build set of all valid MIDI notes across octaves
  for (let octave = -2; octave <= 4; octave++) {
    for (const interval of ctx.scaleIntervals) {
      scaleSet.add(ctx.root + interval + octave * 12);
    }
  }

  return notes.filter((note) => {
    // Must have valid step
    if (note.step < 0 || note.step >= 16) return false;
    // Must have valid velocity
    if (note.velocity <= 0 || note.velocity > 127) return false;
    // Must have positive duration
    if (note.duration <= 0) return false;
    // Must not be NaN
    if (!Number.isFinite(note.note)) return false;

    // Check scale membership (allow ±1 semitone passing tones on weak beats)
    if (!scaleSet.has(note.note)) {
      const isWeakBeat = note.step % 4 !== 0;
      const isNeighbor = scaleSet.has(note.note - 1) || scaleSet.has(note.note + 1);
      if (!(isWeakBeat && isNeighbor)) {
        // Snap to nearest scale note
        let bestNote = note.note;
        let bestDist = Infinity;
        for (const sn of scaleSet) {
          const dist = Math.abs(sn - note.note);
          if (dist < bestDist) {
            bestDist = dist;
            bestNote = sn;
          }
        }
        return { ...note, note: bestNote } as unknown as boolean; // will be handled below
      }
    }
    return true;
  }).map((note) => {
    // Second pass: snap invalid notes
    const scaleArr = Array.from(scaleSet);
    if (!scaleSet.has(note.note)) {
      const isWeakBeat = note.step % 4 !== 0;
      const isNeighbor = scaleSet.has(note.note - 1) || scaleSet.has(note.note + 1);
      if (!(isWeakBeat && isNeighbor)) {
        let bestNote = note.note;
        let bestDist = Infinity;
        for (const sn of scaleArr) {
          const dist = Math.abs(sn - note.note);
          if (dist < bestDist) {
            bestDist = dist;
            bestNote = sn;
          }
        }
        return { ...note, note: bestNote };
      }
    }
    return note;
  });
}

// ============================================================
// HELPERS
// ============================================================

function findNearestChordTone(
  degree: number,
  chordTones: number[],
  scaleSize: number,
): number {
  let best = chordTones[0];
  let bestDist = Infinity;
  for (const ct of chordTones) {
    const wrapped = ((ct % scaleSize) + scaleSize) % scaleSize;
    const wrappedDegree = ((degree % scaleSize) + scaleSize) % scaleSize;
    const dist = Math.min(
      Math.abs(wrapped - wrappedDegree),
      scaleSize - Math.abs(wrapped - wrappedDegree),
    );
    if (dist < bestDist) {
      bestDist = dist;
      best = wrapped;
    }
  }
  return best;
}

function selectOctave(ctx: PipelineContext, beat: number, noteIndex: number): number {
  // Create a contour: start middle, reach up in beat 2, resolve in beat 3
  const contour = [0, 0, 12, 0];
  const baseOctave = contour[beat] || 0;

  // Complexity adds octave variety
  if (ctx.complexity >= 4 && ctx.random() > 0.75) {
    return baseOctave + (ctx.random() > 0.5 ? 12 : -12);
  }

  return baseOctave;
}

// ============================================================
// MAIN PIPELINE
// ============================================================

/**
 * Generates a melody through the structured pipeline.
 * Returns MelodyNote[] compatible with the existing MelodyResult format.
 */
export function runMelodyPipeline(options: GenerateOptions, random: () => number): MelodyNote[] {
  // Stage 1: Create musical context
  const ctx = createContext(options, random);

  // Stage 2: Select chord progression
  const progression = selectProgression(ctx);

  // Stage 3: Generate motif from first chord
  const firstChordTones = progression[0].tones.map(
    (t) => ((t % ctx.scaleSize) + ctx.scaleSize) % ctx.scaleSize,
  );
  const motif = generateMotif(ctx, firstChordTones);

  // Stage 4: Develop motif into phrases across 4 beats
  let notes = developPhrases(ctx, motif, progression);

  // Stage 5: Voice leading & register correction
  notes = applyVoiceLeading(notes, ctx);

  // Stage 6: Humanize velocity
  notes = humanizeVelocity(notes, random);

  // Stage 7: Validate
  notes = validateNotes(notes, ctx);

  // Re-apply voice leading after validation to guarantee maxJump invariant
  notes = applyVoiceLeading(notes, ctx);

  // Ensure at least some notes exist (fallback)
  if (notes.length < 2) {
    const root = ctx.root;
    const third = ctx.scaleIntervals[2 % ctx.scaleSize] || 3;
    const fifth = ctx.scaleIntervals[4 % ctx.scaleSize] || 7;
    notes = [
      { step: 0, note: root, velocity: 95, duration: 2 },
      { step: 4, note: root + third, velocity: 85, duration: 1 },
      { step: 8, note: root + fifth, velocity: 90, duration: 2 },
      { step: 12, note: root, velocity: 88, duration: 1 },
    ];
  }

  // Remove duplicate steps (keep first)
  const seen = new Set<number>();
  const deduped: MelodyNote[] = [];
  for (const n of notes) {
    if (!seen.has(n.step)) {
      seen.add(n.step);
      deduped.push(n);
    }
  }

  return deduped.sort((a, b) => a.step - b.step);
}
