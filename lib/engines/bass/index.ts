import type { StrictGenerationPlan } from '../../director/planner/index.ts';
import type { CompositionState } from '../../core/state/composition.ts';
import type { MusicalEvent } from '../../core/events/index.ts';
import { createDeterministicEventId } from '../../core/events/index.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';

export function generateBass(
  plan: StrictGenerationPlan,
  state: CompositionState,
  layerSeedNamespace: string,
  startTick: number,
  durationTicks: number
): MusicalEvent[] {
  const events: MusicalEvent[] = [];
  const harmony = state.layers.harmony;
  
  // Rule: Bass CANNOT invent parallel progressions. It MUST derive from Harmony layer.
  if (!harmony || !harmony.blocks || harmony.blocks.length === 0) {
    throw new Error('Bass Engine REQUIRES Harmony blocks to exist. Execution order violation!');
  }

  const { rhythmDensity } = plan.constraints;
  const rng = new DeterministicRNG(deriveSeed(layerSeedNamespace, 'bass:groove'));

  // TODO (TECHNICAL DEBT - LOTE 7/8): 
  // This is currently an architectural placeholder. Musical completeness is PARTIAL.
  // We need an "allowedBassVocabulary" that maps root, fifth, octave, passing tones, approach tones.
  
  const endSectionTick = startTick + durationTicks;
  
  // Filter only harmony blocks that belong to this section
  const sectionBlocks = harmony.blocks.filter(b => b.startTick >= startTick && b.startTick < endSectionTick);

  for (const block of sectionBlocks) {
    let currentTick = block.startTick;
    const endTick = block.startTick + block.durationTicks;

    const notesInBlock = Math.max(1, Math.floor(16 * rhythmDensity));
    const stepSize = Math.floor(block.durationTicks / notesInBlock);

    for (let i = 0; i < notesInBlock; i++) {
      if (currentTick >= endTick) break;

      // Drop an octave for Bass
      const bassNote = block.rootNote - 12;
      const duration = Math.min(stepSize, 480);
      
      const restProb = plan.bassProfile?.restProbability ?? ((plan.bassProfile?.syncWithKick ?? 0.5) > 0.6 ? 0.9 : 0.6);
      const isRest = rng.next() > restProb;

      if (!isRest) {
        const payload = `bass-${block.id}-${i}`;
        events.push({
          id: createDeterministicEventId('bass', currentTick, 'NOTE_ON', payload),
          tick: currentTick,
          type: 'NOTE_ON',
          note: bassNote,
          velocity: rng.nextInt(80, 110)
        });
        events.push({
          id: createDeterministicEventId('bass', currentTick + duration, 'NOTE_OFF', payload),
          tick: currentTick + duration,
          type: 'NOTE_OFF',
          note: bassNote
        });
      }
      
      currentTick += stepSize;
    }
  }

  return events;
}
