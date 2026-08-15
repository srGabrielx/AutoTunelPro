import { makeSeed, pick, rng } from "../music/random";
import { KEYS, SCALES, STYLES } from "../music/styles";
import type { BassNote, BassResult, GenerateOptions } from "../music/types";

export function generateBass(options: GenerateOptions): BassResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);
  const preset = STYLES[options.style];
  
  // Scale intervals from options or preset
  const scaleIntervals = options.scale && SCALES[options.scale]
    ? SCALES[options.scale].intervals
    : preset.scale;

  // Base MIDI root note for 808 with configurable octave offset (-36 = C0, -24 = C1, -12 = C2)
  const rootMidi = KEYS[options.key || "C"] ?? 60;
  const octaveOffset = options.bassOctave ?? -24;
  const bassRoot = rootMidi + octaveOffset;

  const comp = Math.min(5, Math.max(1, options.complexity || 3));
  const notes: BassNote[] = [];

  // Determine kick steps to lock 808 with the rhythm
  const mainSteps = options.style === "trap-uk" 
    ? [0, 5, 8, 11, 14] 
    : [0, 6, 10, 14];

  // Primary 808 hits (Root notes on downbeats)
  mainSteps.forEach((step, idx) => {
    if (idx === 0 || random() < 0.75 + comp * 0.05) {
      const degree = random() > 0.3 ? 0 : pick(random, [scaleIntervals[2] || 3, scaleIntervals[4] || 7, -12]);
      const isSlide = options.style === "trap-uk" && comp >= 3 && random() > 0.45;
      const duration = isSlide ? 1 : (comp >= 3 && random() > 0.5 ? 3 : 2);
      
      notes.push({
        step,
        note: bassRoot + degree,
        velocity: Math.round(95 + random() * 25),
        duration,
        slide: isSlide,
      });
    }
  });

  // Syncopated ghost 808s and octave slide accents
  if (comp >= 3) {
    const extraSteps = options.style === "trap-uk" ? [3, 7, 13, 15] : [3, 7, 12, 13];
    extraSteps.forEach((step) => {
      if (!notes.some((n) => n.step === step) && random() < 0.35 + (comp - 3) * 0.18) {
        const octaveJump = random() > 0.6 ? 12 : (options.style === "trap-uk" ? 14 : 0);
        notes.push({
          step,
          note: bassRoot + octaveJump,
          velocity: Math.round(80 + random() * 30),
          duration: 1,
          slide: options.style === "trap-uk" && random() > 0.5,
        });
      }
    });
  }

  // Ensure at least step 0 has a strong 808 root
  if (!notes.some((n) => n.step === 0)) {
    notes.unshift({
      step: 0,
      note: bassRoot,
      velocity: 110,
      duration: 3,
    });
  }

  return {
    engine: "bass",
    seed,
    style: options.style,
    bpm: options.bpm,
    key: options.key || "C",
    scale: options.scale,
    octaveOffset,
    notes: notes.sort((a, b) => a.step - b.step),
  };
}
