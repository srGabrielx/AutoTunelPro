import type { MusicalContext } from "../../core/state/types";

export interface EngineGenerationMetas {
  tension: number;
  resolution: number;
  density: number;
  register: "low" | "mid" | "high";
  phraseLength: number;
  energy: number;
  syncopation: number;
  movement: number;
}

export interface GenerationPlan {
  bpm: number;
  key: string;
  scale: string;
  
  harmony: Pick<EngineGenerationMetas, "tension" | "resolution">;
  melody: Pick<EngineGenerationMetas, "density" | "register" | "phraseLength">;
  drums: Pick<EngineGenerationMetas, "energy" | "syncopation">;
  bass: Pick<EngineGenerationMetas, "movement" | "energy">;

  sectionContext: {
    sectionId: string;
    sectionEnergy: number; // 0 to 1
  };
}

/**
 * GenerationPlanner
 * 
 * Transforma o ResolvedMusicalContext em um GenerationPlan prescritivo e estrito.
 * Os motores NÃO devem decidir sobre energia e densidade, apenas seguir este plano.
 */
export function buildGenerationPlan(
  context: MusicalContext, 
  sectionId: string, 
  sectionEnergyTarget: number
): GenerationPlan {
  
  // A energia da seção influencia os alvos de cada instrumento
  const combinedEnergy = context.intensity * sectionEnergyTarget;
  
  return {
    bpm: context.bpm,
    key: context.key,
    scale: context.scale,
    
    sectionContext: {
      sectionId,
      sectionEnergy: sectionEnergyTarget
    },

    harmony: {
      tension: 0.2 + (combinedEnergy * 0.5),
      resolution: 0.8 - (combinedEnergy * 0.3)
    },
    
    melody: {
      density: 0.2 + (combinedEnergy * 0.6),
      register: combinedEnergy > 0.7 ? "high" : "mid",
      phraseLength: combinedEnergy > 0.8 ? 4 : 8
    },
    
    drums: {
      energy: combinedEnergy,
      syncopation: 0.3 + (context.complexity * 0.5)
    },
    
    bass: {
      movement: 0.2 + (context.complexity * 0.6),
      energy: combinedEnergy
    }
  };
}
