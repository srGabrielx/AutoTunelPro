import type { GenerationIdentity } from "../identity/types";

// Tipagens genéricas para camadas - Serão expandidas nos lotes dos motores
export interface MelodyLayer {
  notes: any[];
}
export interface HarmonyLayer {
  chords: any[];
}
export interface BassLayer {
  notes: any[];
}
export interface DrumLayer {
  hits: any[];
}

export interface MusicalContext {
  bpm: number;
  key: string;
  scale: string;
  mood: string;
  intensity: number;
  complexity: number;
}

export interface GenerationPlan {
  // A ser definido no Lote 2
  [key: string]: any;
}

export interface ArrangementState {
  // A ser definido no Lote 7
  sections: any[];
}

export interface CompositionMemory {
  // A ser definido no Lote 7
  motifs: any[];
}

export interface LayerLocks {
  melody: boolean;
  harmony: boolean;
  bass: boolean;
  drums: boolean;
}

export interface CompositionMetrics {
  repetitionScore: number;
  noveltyScore: number;
  harmonicTension: number;
  rhythmicDensity: number;
}

/**
 * CompositionState
 * 
 * Estado 100% serializável. NENHUM AudioNode, callback ou instância WebAudio aqui.
 */
export interface CompositionState {
  identity: GenerationIdentity;
  context: MusicalContext;
  plan: GenerationPlan | null;
  structure: ArrangementState;
  
  layers: {
    melody: MelodyLayer;
    harmony: HarmonyLayer;
    bass: BassLayer;
    drums: DrumLayer;
  };
  
  memory: CompositionMemory;
  locks: LayerLocks;
  metrics: CompositionMetrics;
  
  revision: number; // Para transações e concorrência
}
