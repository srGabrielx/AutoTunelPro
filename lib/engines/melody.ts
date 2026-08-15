import { makeSeed, pick, rng } from "../music/random";
import { KEYS, SCALES, STYLES } from "../music/styles";
import type { GenerateOptions, MelodyResult } from "../music/types";

export function generateMelody(options: GenerateOptions): MelodyResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);
  const preset = STYLES[options.style];
  const root = KEYS[options.key || "C"] ?? 60;
  const comp = Math.min(5, Math.max(1, options.complexity || 3));

  // Determine scale intervals: user-selected scale or style fallback
  const scaleIntervals = options.scale && SCALES[options.scale]
    ? SCALES[options.scale].intervals
    : preset.scale;

  const density = 0.22 + (comp / 5) * 0.48;
  const notes = [];

  for (let step = 0; step < 16; step++) {
    // Rhythmic phrasing: prioritize strong downbeats and syncopation
    const isStrongBeat = step % 4 === 0;
    const isSyncopated = step % 2 === 1;
    const threshold = isStrongBeat ? density * 1.25 : isSyncopated ? density * 0.9 : density * 0.7;

    if (random() > threshold) continue;

    const degree = pick(random, scaleIntervals);
    // Dark trap octave distribution (-12, 0, +12)
    const octaveChance = random();
    const octave = octaveChance > 0.82 ? 12 : octaveChance < (comp > 3 ? 0.28 : 0.12) ? -12 : 0;

    // Higher complexity creates varied note lengths (sustained vs staccato trap plucks)
    const duration = comp >= 3 && random() > 0.65 ? 2 : 1;
    const velocity = Math.round(70 + random() * 40);

    notes.push({ step, note: root + degree + octave, velocity, duration });
  }

  if (!notes.length) {
    notes.push({ step: 0, note: root, velocity: 95, duration: 2 });
    notes.push({ step: 6, note: root + scaleIntervals[2 % scaleIntervals.length], velocity: 85, duration: 1 });
    notes.push({ step: 10, note: root + scaleIntervals[4 % scaleIntervals.length], velocity: 90, duration: 2 });
  }

  return {
    engine: "melody",
    seed,
    style: options.style,
    bpm: options.bpm,
    key: options.key || "C",
    scale: options.scale,
    notes,
  };
}
