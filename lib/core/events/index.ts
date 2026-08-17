import type { Tick } from '../time/index.ts';

/**
 * EventId represents a deterministic identifier for a musical event.
 * RULE: Alterations to pitch, velocity, duration or position on an existing event MUST preserve its EventId.
 * Only newly inserted events receive new deterministic IDs. Removed events do not have their IDs reused within the same revision lineage.
 */
export type EventId = string;

export type EventType = 'NOTE_ON' | 'NOTE_OFF' | 'CONTROL_CHANGE' | 'PITCH_BEND';

export interface BaseEvent {
  id: EventId;
  tick: Tick;
  type: EventType;
}

export interface NoteOnEvent extends BaseEvent {
  type: 'NOTE_ON';
  note: number;
  velocity: number;
}

export interface NoteOffEvent extends BaseEvent {
  type: 'NOTE_OFF';
  note: number;
}

export type MusicalEvent = NoteOnEvent | NoteOffEvent;

export function createDeterministicEventId(
  layer: string,
  tick: Tick,
  type: EventType,
  payloadHash: string
): EventId {
  return `evt:${layer}:${tick}:${type}:${payloadHash}`;
}
