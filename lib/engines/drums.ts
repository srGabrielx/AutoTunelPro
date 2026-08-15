import { makeSeed, rng } from "../music/random";
import { STYLES } from "../music/styles";
import type { DrumHit, DrumResult, GenerateOptions } from "../music/types";

export function generateDrums(options: GenerateOptions): DrumResult {
  const seed = makeSeed(options.seed);
  const random = rng(seed);
  const preset = STYLES[options.style];
  const hits: DrumHit[] = [];
  const comp = Math.min(5, Math.max(1, options.complexity || 3));
  const patternMode = options.drumPattern || "standard";

  const add = (step: number, drum: DrumHit["drum"], base = 88) =>
    hits.push({ step, drum, velocity: Math.round(base + random() * 25) });

  // 1. Kick Pattern baseado no modo
  if (patternMode === "half-time") {
    // Kick apenas no 1 (step 0) e ghost no 11
    add(0, "kick", 100);
    if (comp >= 3 && random() > 0.4) add(10, "kick", 85);
  } else if (patternMode === "double-time") {
    // Kicks rápidos e constantes
    [0, 3, 6, 8, 10, 14].forEach((step) => add(step, "kick", 94));
  } else {
    // Padrão do estilo
    preset.kick.forEach((step) => {
      if (random() < 0.8 + comp * 0.04) add(step, "kick", 92);
    });
    if (comp >= 3) {
      const ghostSteps = options.style === "trap-uk" ? [3, 8, 14] : [3, 11, 13];
      ghostSteps.forEach((step) => {
        if (random() < 0.35 + (comp - 3) * 0.2) add(step, "kick", 75);
      });
    }
  }

  // 2. Snare / Clap
  if (patternMode === "half-time") {
    // Snare forte apenas no tempo 3 (step 8)
    add(8, "snare", 105);
  } else {
    // Snares normais nos passos 4 e 12 (tempos 2 e 4)
    preset.snare.forEach((step) => add(step, "snare", 96));
    if (comp >= 4 && random() > 0.5) {
      add(14, "snare", 70);
      add(15, "snare", 82);
    }
  }

  // 3. Hi-Hats
  if (patternMode === "triplet-rolls") {
    // Hi-hats em todos os 16 passos com acentos
    for (let s = 0; s < 16; s++) {
      const vel = s % 2 === 0 ? 82 : 68;
      add(s, "hat", vel);
    }
  } else {
    preset.hat.forEach((step) => add(step, "hat", 74));
    if (comp >= 2) {
      [1, 3, 5, 7, 9, 11, 13, 15].forEach((step) => {
        if (random() < 0.35 + (comp / 5) * 0.45) add(step, "hat", 62);
      });
    }
  }

  // 4. Open-Hat
  if (comp >= 2 && random() > 0.3) {
    const openSteps = [2, 6, 10, 14];
    const chosen = openSteps[Math.floor(random() * openSteps.length)];
    add(chosen, "open-hat", 78);
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
