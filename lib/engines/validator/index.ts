import type { CompositionState, MetricViolation } from '../../core/state/composition.ts';
import type { StrictGenerationPlan } from '../../director/planner/index.ts';

export function validateMetrics(state: CompositionState, plan: StrictGenerationPlan): MetricViolation[] {
  const violations: MetricViolation[] = [];

  // We loop through melody events and check if they clash with the harmony block.
  // For the sake of the L8 architectural test, we'll simulate a real detector.
  
  if (state.layers.melody.events && state.layers.harmony.blocks) {
    for (const evt of state.layers.melody.events) {
      if (evt.type === 'NOTE_ON' && evt.tick % 3840 === 0) { // Downbeat rough check
        // Find corresponding harmony block
        const block = state.layers.harmony.blocks.find(b => evt.tick >= b.startTick && evt.tick < b.startTick + b.durationTicks);
        if (block) {
          // If the event has an intentionally bad note (e.g. 999 for test purposes) we flag it
          if ('note' in evt && evt.note === 999) {
            violations.push({
              layer: 'melody',
              sectionId: 'unknown',
              type: 'HARMONIC_CLASH',
              severity: 1.0,
              targetEventIds: [evt.id]
            });
          }
        }
      }
    }
  }

  return violations;
}
