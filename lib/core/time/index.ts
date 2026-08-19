/**
 * Pulses Per Quarter note (PPQ).
 * 960 is the industry standard for high-resolution MIDI sequencing.
 */
export const PPQ = 960;

export interface TimeBase {
  ppq: typeof PPQ;
}

/**
 * A Tick represents a discrete point in musical time based on PPQ.
 */
export type Tick = number;

export function beatsToTicks(beats: number): Tick {
  return Math.round(beats * PPQ);
}

export function ticksToBeats(ticks: Tick): number {
  return ticks / PPQ;
}
