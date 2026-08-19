import type { GenerationPlan, CompositionState, MelodyLayer } from "../../core/state/types";

/**
 * Motor de Melodia Principal
 * 
 * Função PURA. Sem RNG global, sem acesso a banco, sem tocar áudio.
 * Recebe o Plano de Geração, o Estado atual (para memória/harmonia) e a Seed.
 * Retorna os eventos musicais brutos.
 */
export function generateMelody(plan: GenerationPlan, state: CompositionState, seed: number): MelodyLayer {
  // Inicializamos o PRNG local e isolado para esta semente
  const random = createDeterministicRNG(seed);
  
  const notes = [];
  const totalSteps = 16; // Assumido por simplicidade
  
  // A densidade do plano dita a probabilidade de preencher um passo
  const density = plan.melody.density;
  
  let currentNote = plan.key === "C" ? 60 : 62; // Placeholder de nota base

  for (let step = 0; step < totalSteps; step++) {
    if (random() < density) {
      // Se a intenção pedir saltos curtos
      const direction = random() > 0.5 ? 1 : -1;
      const interval = Math.floor(random() * 3) + 1; // 1 a 3 semitons de salto
      currentNote = currentNote + (direction * interval);

      // Limita ao registro planejado
      if (plan.melody.register === "high" && currentNote < 72) currentNote += 12;
      else if (plan.melody.register === "low" && currentNote > 48) currentNote -= 12;

      notes.push({
        step,
        note: currentNote,
        duration: random() > 0.5 ? 2 : 1, // Durations simples
        velocity: Math.floor(80 + (random() * 40)) // Velocity baseada no piano roll
      });
    }
  }

  return {
    notes
  };
}

// Simples construtor de RNG determinístico
function createDeterministicRNG(seed: number) {
  let m_w = seed;
  let m_z = 987654321;
  const mask = 0xffffffff;

  return function() {
    m_z = (36969 * (m_z & 65535) + (m_z >> 16)) & mask;
    m_w = (18000 * (m_w & 65535) + (m_w >> 16)) & mask;
    let result = ((m_z << 16) + m_w) & mask;
    result /= 4294967296;
    return result + 0.5;
  }
}
