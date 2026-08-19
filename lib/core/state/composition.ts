import type { GenerationIdentity } from '../identity/generation.ts';
import type { ResolvedMusicalContext } from '../../director/context/resolver.ts';
import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import type { MusicalEvent } from '../events/index.ts';

export type MusicalContext = ResolvedMusicalContext;
export type GenerationPlan = StrictGenerationPlan;
export interface ArrangementSection {
  id: string;
  type: 'intro' | 'verse' | 'hook' | 'bridge' | 'outro' | 'break';
  startTick: number;
  durationTicks: number;
  energy: number;
  density: number;
  novelty: number;
  inheritFrom?: string;
  mutationBudget?: number;
}

export interface ArrangementState {
  sections: ArrangementSection[];
  totalTicks: number;
}

export interface HarmonicBlock {
  id: string;
  startTick: number;
  durationTicks: number;
  chord: string;
  rootNote: number;
  scale: string;
}

export interface MelodyLayer {
  events: MusicalEvent[];
  variationIndex: number;
}
export interface HarmonyLayer {
  blocks: HarmonicBlock[];
  variationIndex: number;
}
export interface BassLayer {
  events: MusicalEvent[];
  variationIndex: number;
}
export interface DrumLayer {
  events: MusicalEvent[];
  variationIndex: number;
}
export interface VariationLineage {
  sourceSectionId: string;
  sourcePhraseId?: string;
  sourceMotifId?: string;
  variationIndex: number;
  mutationBudget: number;
}

export interface MotifMemory {
  motifId: string;
  sourceLayer: string;
  sourceSection: string;
  pitchContour: number[];
  rhythmSignature: number[]; // Array of Ticks offsets
  usageCount: number;
  lastUsedSection?: string;
}

export interface PhraseMemory {
  phraseId: string;
  motifs: string[]; // Motif IDs
}

export interface SectionMemory {
  sectionId: string;
  harmonicSignature: string[]; // Ex: blocks IDs
  rhythmicFingerprint: number; // Density proxy
}

export interface GlobalMemory {
  motifsIntroduced: number;
  motifsReused: number;
}

export interface CompositionMemory {
  motifs: MotifMemory[];
  phrases: PhraseMemory[];
  sections: SectionMemory[];
  global: GlobalMemory;
}

export interface LayerLocks {
  melody: boolean;
  harmony: boolean;
  bass: boolean;
  drums: boolean;
}
export interface MetricViolation {
  layer: string;
  sectionId: string;
  type: 'HARMONIC_CLASH' | 'VOICE_LEADING' | 'DENSITY_MISMATCH' | 'RHYTHM_COLLISION';
  severity: number; // 0.0 to 1.0
  targetEventIds: string[];
}

export interface CompositionMetrics {
  voiceLeadingScore: number;
  harmonicCohesionScore: number;
  rhythmicDensityScore: number;
  violations: MetricViolation[];
  repairAttempts: number;
  qualityStatus: 'PRISTINE' | 'DEGRADED';
}

/**
 * The definitive, serializable state of a composition.
 * RULE: Must NEVER contain runtime instances like AudioNodes, WebAudio contexts, or callbacks.
 */
export interface CompositionState {
  identity: GenerationIdentity;
  context: MusicalContext;
  plan: GenerationPlan;
  
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

  revision: number;
}
