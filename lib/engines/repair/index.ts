import type { CompositionState, MetricViolation } from '../../core/state/composition.ts';
import type { MusicalEvent } from '../../core/events/index.ts';

export function runRepairEngine(state: CompositionState, violations: MetricViolation[]): void {
  // We mutate the state directly since it is a draft inside the transaction.
  
  for (const violation of violations) {
    if (violation.layer === 'melody' && !state.locks.melody) {
      const newEvents: MusicalEvent[] = [];
      for (const evt of state.layers.melody.events) {
        if (violation.targetEventIds.includes(evt.id)) {
          if (violation.type === 'HARMONIC_CLASH') {
            // Surgical fix: we don't regenerate, we just fix the pitch.
            // Example: note was 999 (invalid clash), we snap it to 60 (C4).
            // We PRESERVE the EventId because semantically it is the same note taking its proper place.
            newEvents.push({
              ...evt,
              note: 60, 
            });
          } else {
            newEvents.push(evt);
          }
        } else {
          newEvents.push(evt);
        }
      }
      state.layers.melody.events = newEvents;
    }
    // Implement other layers here if needed
  }
}
