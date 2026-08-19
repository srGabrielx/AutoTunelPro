import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import type { CompositionState, HarmonicBlock } from '../../core/state/composition.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';

const SCALES: Record<string, number[]> = {
  'major': [0, 2, 4, 5, 7, 9, 11],
  'minor': [0, 2, 3, 5, 7, 8, 10]
};

const CHORD_PROGRESSIONS: Record<string, number[]> = {
  'minor-0': [0, 5, 3, 7], // i - VI - iv - V
  'minor-1': [0, 3, 7, 5], // i - III - VII - VI
  'major-0': [0, 5, 7, 0], // I - IV - V - I
  'major-1': [0, 7, 5, 4], // I - V - vi - IV
};

export function generateHarmony(
  plan: StrictGenerationPlan,
  state: CompositionState,
  layerSeedNamespace: string,
  startTick: number,
  durationTicks: number
): HarmonicBlock[] {
  const blocks: HarmonicBlock[] = [];
  const rootNoteStr = state.context.key;
  const scaleType = state.context.scale;

  const ROOT_MAP: Record<string, number> = {
    'C': 36, 'C#': 37, 'D': 38, 'D#': 39, 'E': 40, 'F': 41, 'F#': 42, 'G': 43, 'G#': 44, 'A': 45, 'A#': 46, 'B': 47
  };
  const baseRoot = ROOT_MAP[rootNoteStr] || 36;

  const rng = new DeterministicRNG(deriveSeed(layerSeedNamespace, 'harmony:progression'));
  
  const possibleProgressions = scaleType === 'minor' ? ['minor-0', 'minor-1'] : ['major-0', 'major-1'];
  const progChoice = rng.nextInt(0, possibleProgressions.length - 1);
  const progression = CHORD_PROGRESSIONS[possibleProgressions[progChoice]];
  
  const scaleDegrees = SCALES[scaleType] || SCALES['minor'];
  
  // Create blocks based on rhythm density or standard bar duration
  // For simplicity, we use 1 bar blocks (3840 ticks)
  const barTicks = 3840; 
  const numBlocks = Math.max(1, Math.floor(durationTicks / barTicks));
  const actualBlockDuration = Math.floor(durationTicks / numBlocks);
  
  for (let i = 0; i < numBlocks; i++) {
    const degreeIndex = progression[i % progression.length];
    
    // Scale degrees maps the functional degree (0-6) to semitones
    // degreeIndex could be 7, so we wrap
    const validDegree = degreeIndex % 7;
    const offsetInSemitones = scaleDegrees[validDegree] !== undefined ? scaleDegrees[validDegree] : 0;
    
    const chordRoot = baseRoot + offsetInSemitones;
    
    blocks.push({
      id: `chord-${startTick}-${i}`,
      startTick: startTick + (i * actualBlockDuration),
      durationTicks: actualBlockDuration,
      chord: `${rootNoteStr}-deg-${validDegree}`,
      rootNote: chordRoot,
      scale: scaleType
    });
  }

  return blocks;
}
