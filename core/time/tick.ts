/**
 * Tick/PPQ Time Model
 *
 * This module defines the canonical time representation for the Core generation engine.
 * Using Ticks/PPQ (Pulses Per Quarter note) instead of seconds guarantees compositional
 * determinism across different devices and runtimes.
 *
 * Conversion to AudioContext time (seconds) is handled strictly at the AudioTransport boundary.
 */

export const PPQ = 960; // Standard Pulses Per Quarter Note resolution

export type Tick = number;

/**
 * Converts a musical position (bars, beats, sixteenths) to Ticks.
 * Assuming 4/4 time signature by default for standard conversions.
 */
export function positionToTicks(bar: number, beat: number = 0, sixteenth: number = 0): Tick {
  const ticksPerBeat = PPQ;
  const ticksPerSixteenth = PPQ / 4;
  
  return (bar * 4 * ticksPerBeat) + (beat * ticksPerBeat) + (sixteenth * ticksPerSixteenth);
}

/**
 * Helper to convert ticks to seconds based on a given BPM.
 * ONLY to be used by the AudioTransport boundary, NOT by generators.
 */
export function ticksToSeconds(ticks: Tick, bpm: number): number {
  const beats = ticks / PPQ;
  const secondsPerBeat = 60 / bpm;
  return beats * secondsPerBeat;
}
