import type { MusicalEvent, EventId } from '../../core/events/index.ts';
import { createDeterministicEventId } from '../../core/events/index.ts';
import { DeterministicRNG } from '../../core/seeds/rng.ts';
import { deriveSeed } from '../../core/seeds/namespace.ts';

export interface VariationParams {
  sourceEvents: MusicalEvent[];
  mutationBudget: number; // 0.0 to 1.0
  sourceSectionStartTick: number;
  targetSectionStartTick: number;
  layer: string;
  variationSeedNamespace: string;
}

export function generateVariation(params: VariationParams): MusicalEvent[] {
  const { sourceEvents, mutationBudget, sourceSectionStartTick, targetSectionStartTick, layer, variationSeedNamespace } = params;
  
  const rng = new DeterministicRNG(deriveSeed(variationSeedNamespace, 'variation:core'));
  const events: MusicalEvent[] = [];
  
  const tickOffset = targetSectionStartTick - sourceSectionStartTick;

  // Track which IDs were preserved
  let preservedCount = 0;
  let mutatedCount = 0;

  for (const sourceEvent of sourceEvents) {
    // If budget is 0.0, we just copy everything shifted by the tick offset
    if (mutationBudget === 0) {
      events.push({ ...sourceEvent, tick: sourceEvent.tick + tickOffset });
      preservedCount++;
      continue;
    }

    // Determine if we mutate this event based on budget
    const shouldMutate = rng.next() < mutationBudget;
    
    if (!shouldMutate) {
      // Preservation: exact copy, offset in time, SAME EVENT ID!
      events.push({ ...sourceEvent, tick: sourceEvent.tick + tickOffset });
      preservedCount++;
    } else {
      mutatedCount++;
      // Mutation operations (simple pitch shift or velocity shift)
      const opChoice = rng.nextInt(0, 10);
      
      let newEvent = { ...sourceEvent, tick: sourceEvent.tick + tickOffset };
      let semanticChange = false;

      if (opChoice < 3 && newEvent.type === 'NOTE_ON') {
        // Minor velocity shift (preserved semantic identity)
        newEvent.velocity = Math.max(10, Math.min(127, newEvent.velocity! + rng.nextInt(-15, 15)));
      } else if (opChoice < 6 && (newEvent.type === 'NOTE_ON' || newEvent.type === 'NOTE_OFF')) {
        // Minor pitch shift (passing tone, neighbor tone). We'll assume scale is OK for now.
        newEvent.note = newEvent.note + rng.nextInt(-2, 2);
        semanticChange = true;
      } else if (opChoice < 8) {
        // Silence mutation (skip adding this event completely to thin out the arrangement)
        continue;
      } else {
        // Rhythmic shift (syncopation anticipation)
        const shift = rng.nextInt(-120, 120);
        newEvent.tick = Math.max(targetSectionStartTick, newEvent.tick + shift);
        semanticChange = true;
      }

      // If semantic change occurred, we MUST derive a new deterministic EventId
      // Otherwise we preserve the old EventId.
      if (semanticChange) {
        newEvent.id = createDeterministicEventId(layer, newEvent.tick, newEvent.type, `variation-mut-${mutatedCount}`);
      }
      
      events.push(newEvent);
    }
  }

  // NOTE: A real implementation would also ADD events if the novelty budget requires it,
  // but for L7 this fulfills the Variation deterministic criteria.
  
  return events;
}
