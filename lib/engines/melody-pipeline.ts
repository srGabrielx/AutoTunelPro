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
 *  4. Synth-specific generation (pad chords, arpeggios, plucks, leads)
 *  5. Voice leading & register correction
 *  6. Deterministic humanization (velocity variation)
 *  7. Final validation (scale membership, register bounds)
 */

import { pick } from "../music/random.ts";
import { KEYS, SCALES, STYLES } from "../music/styles.ts";
import type { GenerateOptions, MelodyNote, MelodySynthType, StyleId } from "../music/types.ts";
import {
  GENRE_MELODY_PROFILES,
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
  harmonicTemperature: number;
  synthType: MelodySynthType;
  random: () => number;
  style: StyleId;
  sharedProgression?: ChordDegrees[];
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
  const harmonicTemperature = Math.min(1.0, Math.max(0.1, (comp - 0.5) / 4.5));
  const synthType = options.synthType ?? "lead";

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
    harmonicTemperature,
    synthType,
    random,
    style: options.style,
    sharedProgression: options.compositionPlan?.harmonicGrid.map((region) => ({
      label: region.label,
      tones: [...region.chordDegrees],
    })),
  };
}

// ============================================================
// STAGE 2: SELECT CHORD PROGRESSION
// ============================================================

function selectProgression(ctx: PipelineContext): ChordDegrees[] {
  if (ctx.sharedProgression && ctx.sharedProgression.length > 0) {
    return ctx.sharedProgression;
  }
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
// STAGE 4: DEVELOP MOTIF INTO PHRASES (FOR LEADS)
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

      // Strong beats (step 0, 4, 8, 12) should prefer chord tones based on harmonic temperature
      const isStrongBeat = step % 4 === 0;
      const snapThreshold = 0.2 + (1.0 - ctx.harmonicTemperature) * 0.6;
      if (isStrongBeat && ctx.random() < snapThreshold) {
        // Snap to nearest chord tone
        degree = findNearestChordTone(degree, chord.tones, ctx.scaleSize);
      }

      // Convert degree to MIDI note
      const interval = ctx.scaleIntervals[degree % ctx.scaleSize];

      // Octave placement based on register range and contour
      const octaveOffset = selectOctave(ctx, beat);
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

    // Add a passing tone on weak beats scaled by harmonic temperature
    if (ctx.harmonicTemperature > 0.4 && ctx.random() < ctx.harmonicTemperature * 0.7) {
      const weakStep = beatStart + (ctx.random() > 0.5 ? 1 : 3);
      if (weakStep < 16 && !notes.some((n) => n.step === weakStep)) {
        // Passing tone: use a non-chord scale degree
        const passingDegree = Math.floor(ctx.random() * ctx.scaleSize);
        const passingInterval = ctx.scaleIntervals[passingDegree];
        const octave = selectOctave(ctx, beat);
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
// STAGE 4B: SYNTH-SPECIFIC GENERATORS
// ============================================================

/**
 * Generates rich, sustained chord pad voicings (2-3 voices per chord).
 */
function generatePadChords(ctx: PipelineContext, progression: ChordDegrees[]): MelodyNote[] {
  const notes: MelodyNote[] = [];
  const stepsPerChord = 4;

  for (let beat = 0; beat < 4; beat++) {
    const step = beat * stepsPerChord;
    const chord = progression[beat];
    const tones = chord.tones;

    // Voicing: Root, 3rd, 5th
    const rootDegree = tones[0];
    const thirdDegree = tones[1 % tones.length];
    const fifthDegree = tones[2 % tones.length];

    const rootInterval = ctx.scaleIntervals[rootDegree % ctx.scaleSize];
    const thirdInterval = ctx.scaleIntervals[thirdDegree % ctx.scaleSize];
    const fifthInterval = ctx.scaleIntervals[fifthDegree % ctx.scaleSize];

    // Warm pad octave (MIDI 55 - 72)
    let rootNote = ctx.root + rootInterval;
    while (rootNote < 50) rootNote += 12;
    while (rootNote > 64) rootNote -= 12;

    let thirdNote = ctx.root + thirdInterval;
    while (thirdNote <= rootNote) thirdNote += 12;
    while (thirdNote > 74) thirdNote -= 12;

    let fifthNote = ctx.root + fifthInterval;
    while (fifthNote <= thirdNote) fifthNote += 12;
    while (fifthNote > 79) fifthNote -= 12;

    const baseVel = 80;
    const duration = 4; // Sustained through whole beat region

    notes.push({ step, note: rootNote, velocity: baseVel, duration });
    notes.push({ step, note: thirdNote, velocity: baseVel - 4, duration });
    notes.push({ step, note: fifthNote, velocity: baseVel - 6, duration });

    // If 7th tone is present or complexity >= 4, add smooth 7th color
    if (tones.length >= 4 || (ctx.complexity >= 4 && ctx.random() > 0.4)) {
      const seventhDegree = tones.length >= 4 ? tones[3] : (tones[0] + 6) % ctx.scaleSize;
      const seventhInterval = ctx.scaleIntervals[seventhDegree % ctx.scaleSize];
      let seventhNote = ctx.root + seventhInterval;
      while (seventhNote <= fifthNote) seventhNote += 12;
      if (seventhNote <= 84) {
        notes.push({ step, note: seventhNote, velocity: baseVel - 10, duration });
      }
    }
  }

  return notes;
}

/**
 * Generates 16th-note arpeggiated movement outlining current chord harmonies.
 */
function generateArpeggio(ctx: PipelineContext, progression: ChordDegrees[]): MelodyNote[] {
  const notes: MelodyNote[] = [];

  for (let s = 0; s < 16; s++) {
    const beat = Math.floor(s / 4);
    const chord = progression[beat];
    const tones = chord.tones;
    const slot = s % 4;

    // Arp patterns (1-3-5-3 or 1-5-8-5)
    let degreeIdx = 0;
    let octaveOffset = 12;

    if (slot === 0) {
      degreeIdx = 0; // Root
    } else if (slot === 1) {
      degreeIdx = 1 % tones.length; // 3rd
    } else if (slot === 2) {
      degreeIdx = 2 % tones.length; // 5th
    } else {
      degreeIdx = 1 % tones.length; // 3rd or octave
      if (ctx.random() > 0.5) octaveOffset += 12;
    }

    const degree = tones[degreeIdx];
    const interval = ctx.scaleIntervals[degree % ctx.scaleSize];
    let note = ctx.root + interval + octaveOffset;
    while (note < 60) note += 12;
    while (note > 86) note -= 12;

    const velocity = slot === 0 ? 92 : slot === 2 ? 84 : 74;
    notes.push({
      step: s,
      note,
      velocity,
      duration: 1,
    });
  }

  return notes;
}

/**
 * Generates syncopated, rhythmic high-register pluck motifs.
 */
function generatePluckMelody(
  ctx: PipelineContext,
  motif: MotifNote[],
  progression: ChordDegrees[],
): MelodyNote[] {
  const notes: MelodyNote[] = [];
  const pluckRhythm = [0, 2, 5, 8, 10, 13];

  for (let i = 0; i < pluckRhythm.length; i++) {
    const step = pluckRhythm[i];
    const beat = Math.floor(step / 4);
    const chord = progression[beat];
    const isStrong = step % 4 === 0;

    // Pick chord tone on strong steps, or pentatonic passing tone
    let degree = chord.tones[i % chord.tones.length];
    if (!isStrong && ctx.random() > 0.4) {
      const pentatonicStep = (degree + (ctx.random() > 0.5 ? 2 : 1)) % ctx.scaleSize;
      degree = pentatonicStep;
    }

    const interval = ctx.scaleIntervals[degree % ctx.scaleSize];
    let note = ctx.root + interval + 12;
    if (ctx.complexity >= 4 && ctx.random() > 0.6) note += 12;
    while (note < 65) note += 12;
    while (note > 92) note -= 12;

    const velocity = isStrong ? 95 : 82;
    const duration = isStrong ? 2 : 1;

    notes.push({ step, note, velocity, duration });
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
      const jump = Math.abs(sorted[i].note - prev);
      if (jump > ctx.profile.maxJump) {
        const original = sorted[i].note;
        let candidate = original;
        let bestJump = Math.abs(candidate - prev);
        let bestDisplacement = 0;
        for (let octave = -5; octave <= 5; octave++) {
          const octaveCandidate = original + octave * 12;
          if (octaveCandidate < safeMin || octaveCandidate > safeMax) continue;
          const jump = Math.abs(octaveCandidate - prev);
          const displacement = Math.abs(octaveCandidate - original);
          if (
            jump < bestJump ||
            (jump === bestJump && displacement < bestDisplacement)
          ) {
            candidate = octaveCandidate;
            bestJump = jump;
            bestDisplacement = displacement;
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
    const variation = Math.round((random() * 2 - 1) * 8);
    const velocity = Math.max(55, Math.min(120, note.velocity + variation));
    return { ...note, velocity };
  });
}

// ============================================================
// STAGE 7: VALIDATE
// ============================================================

/**
 * Ensures all notes belong strictly to the scale.
 */
function validateNotes(notes: MelodyNote[], ctx: PipelineContext): MelodyNote[] {
  const scaleSet = new Set<number>();
  // Build set of all valid MIDI notes across octaves
  for (let octave = -3; octave <= 5; octave++) {
    for (const interval of ctx.scaleIntervals) {
      scaleSet.add(ctx.root + interval + octave * 12);
    }
  }
  const scaleArr = Array.from(scaleSet).sort((a, b) => a - b);

  return notes
    .filter((note) => {
      // Must have valid step
      if (note.step < 0 || note.step >= 16) return false;
      // Must have valid velocity
      if (note.velocity <= 0 || note.velocity > 127) return false;
      // Must have positive duration
      if (note.duration <= 0) return false;
      // Must not be NaN
      if (!Number.isFinite(note.note)) return false;
      return true;
    })
    .map((note) => {
      if (!scaleSet.has(note.note)) {
        // Snap to nearest scale note
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

function selectOctave(ctx: PipelineContext, beat: number): number {
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

  let notes: MelodyNote[];

  // Stage 3 & 4: Specialized generation by synth role
  if (ctx.synthType === "pad") {
    notes = generatePadChords(ctx, progression);
  } else if (ctx.synthType === "arp") {
    notes = generateArpeggio(ctx, progression);
  } else if (ctx.synthType === "pluck") {
    const firstChordTones = progression[0].tones.map(
      (t) => ((t % ctx.scaleSize) + ctx.scaleSize) % ctx.scaleSize,
    );
    const motif = generateMotif(ctx, firstChordTones);
    notes = generatePluckMelody(ctx, motif, progression);
  } else {
    // Lead / default melody
    const firstChordTones = progression[0].tones.map(
      (t) => ((t % ctx.scaleSize) + ctx.scaleSize) % ctx.scaleSize,
    );
    const motif = generateMotif(ctx, firstChordTones);
    notes = developPhrases(ctx, motif, progression);
    notes = applyVoiceLeading(notes, ctx);
  }

  // Stage 5: Humanize velocity
  notes = humanizeVelocity(notes, random);

  // Stage 6: Validate & Snap to scale
  notes = validateNotes(notes, ctx);

  // Re-apply voice leading for leads
  if (ctx.synthType === "lead") {
    notes = applyVoiceLeading(notes, ctx);
  }

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

  // Deduplicate: For pad allow polyphony (multiple notes on same step with distinct pitches)
  // For lead/arp/pluck keep unique steps
  const isPolyphonic = ctx.synthType === "pad";
  const seen = new Set<string>();
  const deduped: MelodyNote[] = [];

  for (const n of notes) {
    const key = isPolyphonic ? `${n.step}:${n.note}` : `${n.step}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(n);
    }
  }

  return deduped.sort((a, b) => a.step - b.step || a.note - b.note);
}
