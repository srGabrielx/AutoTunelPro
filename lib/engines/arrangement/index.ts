import type { ArrangementState, ArrangementSection } from '../../core/state/composition.ts';
import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';

export function generateArrangement(
  plan: StrictGenerationPlan,
  layerSeedNamespace: string
): ArrangementState {
  const rng = new DeterministicRNG(deriveSeed(layerSeedNamespace, 'arrangement:structure'));
  
  // Base durations
  const BAR_TICKS = 3840; // 4 beats * 960 PPQ
  const sections: ArrangementSection[] = [];
  let currentTick = 0;
  
  const addSection = (
    id: string, 
    type: ArrangementSection['type'], 
    bars: number, 
    energy: number, 
    density: number, 
    novelty: number, 
    inheritFrom?: string,
    mutationBudget?: number
  ) => {
    const durationTicks = bars * BAR_TICKS;
    sections.push({
      id,
      type,
      startTick: currentTick,
      durationTicks,
      energy,
      density,
      novelty,
      inheritFrom,
      mutationBudget
    });
    currentTick += durationTicks;
  };

  // Intro
  addSection('intro-a', 'intro', 4, 0.3, 0.2, 0.8);
  
  // Verse A
  addSection('verse-a', 'verse', 8, 0.5, 0.5, 0.7);
  
  // Hook A
  addSection('hook-a', 'hook', 8, 0.9, 0.8, 0.9);
  
  // Verse A' (Inherits from Verse A, slight variation)
  addSection('verse-a-prime', 'verse', 8, 0.6, 0.6, 0.4, 'verse-a', 0.25);
  
  // Hook A' (Inherits from Hook A, stronger variation)
  addSection('hook-a-prime', 'hook', 8, 1.0, 0.9, 0.5, 'hook-a', 0.15);
  
  // Outro
  addSection('outro-a', 'outro', 4, 0.2, 0.1, 0.1);

  return {
    sections,
    totalTicks: currentTick
  };
}
