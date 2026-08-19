import { Tick } from '../time/tick';

/**
 * MusicalEvent Contract
 * 
 * The central contract representing a deterministic musical event.
 * All generation engines output an array of MusicalEvents.
 */
export interface MusicalEvent {
  /** Deterministic global ID: generation:section:layer:phrase:eventIndex */
  id: string;
  
  layerId: string;
  sectionId: string;
  
  /** MIDI Pitch number (e.g., 60 for Middle C) */
  pitch: number;
  
  /** Start time in Ticks */
  startTick: Tick;
  
  /** Duration in Ticks */
  durationTicks: Tick;
  
  /** MIDI Velocity (0-127) */
  velocity: number;
  
  /** Optional articulation or playing style (e.g., 'staccato', 'legato', 'palm-mute') */
  articulation?: string;
  
  /** Optional parameters map for synthesizer specific macros (e.g., cutoff) */
  params?: Record<string, number | string>;
}
