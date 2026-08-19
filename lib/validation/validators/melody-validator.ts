import type { MelodyLayer } from "../../core/state/types";

export interface Violation {
  type: string;
  layer: string;
  severity: number;
}

export interface ValidationReport {
  score: number;
  violations: Violation[];
}

/**
 * Melody Validator
 * 
 * Avalia o resultado gerado pelo Motor de Melodia.
 * Não apenas rejeita, mas produz diagnósticos detalhados.
 */
export function validateMelody(layer: MelodyLayer): ValidationReport {
  const violations: Violation[] = [];
  let score = 1.0;

  // Verifica se há densidade nula (silêncio total)
  if (layer.notes.length === 0) {
    violations.push({
      type: "EMPTY_MELODY",
      layer: "melody",
      severity: 1.0
    });
    score -= 1.0;
  }

  // Verifica saltos de oitava bizarros (> 12 semitons repetidamente)
  let hugeJumps = 0;
  for (let i = 1; i < layer.notes.length; i++) {
    const jump = Math.abs(layer.notes[i].note - layer.notes[i-1].note);
    if (jump > 12) hugeJumps++;
  }

  if (hugeJumps > 3) {
    violations.push({
      type: "ERRATIC_CONTOUR",
      layer: "melody",
      severity: 0.5
    });
    score -= 0.3;
  }

  // Verifica repetição excessiva da mesma nota (estático)
  const uniqueNotes = new Set(layer.notes.map(n => n.note));
  if (layer.notes.length > 4 && uniqueNotes.size === 1) {
    violations.push({
      type: "EXCESSIVE_REPETITION",
      layer: "melody",
      severity: 0.8
    });
    score -= 0.6;
  }

  return {
    score: Math.max(0, score),
    violations
  };
}
