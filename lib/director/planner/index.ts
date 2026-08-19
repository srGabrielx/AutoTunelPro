import type { ResolvedMusicalContext } from '../context/resolver.ts';

import type { 
  HarmonicProfile, 
  MelodyProfile, 
  BassProfile, 
  DrumProfile, 
  SynthesisProfile, 
  ArrangementProfile 
} from '../../music/types.ts';

export interface StrictGenerationPlan {
  bpm: number;
  scale: string;
  key: string;
  complexity: number;
  energy: number;
  density: number;
  mood: string;
  sectionType: string;
  
  // L10: Data-Driven Profiles
  harmonicProfile: HarmonicProfile;
  melodyProfile: MelodyProfile;
  bassProfile: BassProfile;
  drumProfile: DrumProfile;
  synthesisProfile: SynthesisProfile;
  arrangementProfile: ArrangementProfile;

  constraints: {
    rhythmDensity: number;
    pitchRange: [number, number];
    phraseLength: number;
  };
}

/**
 * Translates the Abstract Context into Strict Constraints (the Absolute Authority)
 */
export function createGenerationPlan(context: ResolvedMusicalContext): StrictGenerationPlan {
  let mood = 'NEUTRAL';
  if (context.darkness > 0.7 && context.energy > 0.7) mood = 'AGGRESSIVE';
  else if (context.darkness > 0.7) mood = 'DARK';
  else if (context.energy > 0.7) mood = 'ENERGETIC';
  else if (context.darkness < 0.3) mood = 'LIGHT';

  return {
    bpm: context.bpm,
    scale: context.scale,
    key: context.key,
    complexity: context.complexity,
    energy: context.energy,
    density: context.density,
    mood,
    sectionType: context.section?.type ?? 'VERSE',
    
    // L10: O profile inteiro flui para o plano como DADOS (com fallback robusto para testes L0-L9 com mocks fracos)
    harmonicProfile: context.preset?.harmonicProfile ?? { allowedScales: ['natural-minor'], defaultScale: 'natural-minor', complexity: 0.5 },
    melodyProfile: context.preset?.melodyProfile ?? { syncopation: 0.5, phraseLengths: [4], densityRange: [0.3, 0.7] },
    bassProfile: context.preset?.bassProfile ?? { type: '808', slideProbability: 0.2, syncWithKick: 0.8, restProbability: 0.8, octaveJumpProbability: 0.2, sustainRatio: 1.0 },
    drumProfile: context.preset?.drumProfile ?? { hatRolls: true, hatRollThreshold: 0.85, favoredRollCount: 2, pitchDropProbability: 0.25, kickSyncopation: 0.6, kickDensity: 16, kickGapMin: 1, kickGapMax: 4, snareOn: [2, 4], snareDensity: 8, snareGapMin: 2, snareGapMax: 4, ghostNoteProbability: 0.1, offbeatEmphasis: false },
    synthesisProfile: context.preset?.synthesisProfile ?? {},
    arrangementProfile: context.preset?.arrangementProfile ?? { energyCurve: 'build-drop' },

    constraints: {
      rhythmDensity: context.density ?? 0.5,
      pitchRange: [36, 84], // Strict 11/10 constraint
      phraseLength: context.preset?.melodyProfile?.phraseLengths[0] ?? (context.section?.type === 'HOOK' || context.energy > 0.8 ? 4 : 8)
    }
  };
}
