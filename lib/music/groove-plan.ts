import type { DrumHit, DrumRoll } from "./types.ts";

export interface GrooveEvent {
  eventId: string;
  trackId: string;
  instrument: "kick" | "snare" | "hat" | "open-hat";
  step: number;
  subIndex: number;
  timeSeconds: number;
  velocity: number;
  microTimingMs: number;
  pitchCents?: number;
  pitchCurve?: {
    startCents: number;
    endCents: number;
    durationMs: number;
  };
  filterCurve?: {
    startHz: number;
    endHz: number;
    durationMs: number;
  };
}

export interface BuildGroovePlanInput {
  hits: DrumHit[];
  bpm: number;
  patternDurationSteps?: number;
  loopOffsetSec?: number;
  seed?: number;
}

/**
 * Pure function: Single Source of Truth for Groove & Drum Event Plans.
 * Used by both Web Audio scheduler (audio-transport.ts) and WAV DSP export (dsp-renderer.ts).
 */
export function buildGrooveEventPlan(input: BuildGroovePlanInput): GrooveEvent[] {
  const { hits, bpm, patternDurationSteps = 16, loopOffsetSec = 0 } = input;
  const stepDuration = 60 / bpm / 4;
  const patternDurationSec = patternDurationSteps * stepDuration;
  const events: GrooveEvent[] = [];

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    if (hit.step < 0 || hit.step >= patternDurationSteps) continue;

    // Lock main downbeats of Kick & Snare to grid
    const isMainDownbeat = (hit.drum === "kick" || hit.drum === "snare") && hit.step % 4 === 0;
    const rawMicroTiming = isMainDownbeat ? 0 : (hit.microTimingMs || 0);

    // Limit microtiming strictly between -15ms and +15ms
    const microTimingMs = Math.max(-15, Math.min(15, rawMicroTiming));
    const microTimingSec = microTimingMs / 1000;

    const roll: DrumRoll = hit.roll || { count: 1, velocityCurve: "flat" };
    const rollCount = roll.count || 1;
    const rollInterval = stepDuration / rollCount;

    for (let subIndex = 0; subIndex < rollCount; subIndex++) {
      const subOffsetSec = subIndex * rollInterval;
      const rawStepTime = hit.step * stepDuration + microTimingSec + subOffsetSec;

      // Ensure event never has negative timestamp and never leaves the measure
      const clampedPatternTime = Math.max(
        0,
        Math.min(patternDurationSec - 0.0005, rawStepTime)
      );
      const timeSeconds = loopOffsetSec + clampedPatternTime;

      // Calculate dynamic velocity
      let velScale = 1.0;
      if (roll.velocityCurve === "crescendo" && rollCount > 1) {
        velScale = 0.55 + 0.45 * (subIndex / (rollCount - 1));
      } else if (roll.velocityCurve === "decrescendo" && rollCount > 1) {
        velScale = 1.0 - 0.45 * (subIndex / (rollCount - 1));
      }
      const velocity = Math.max(25, Math.min(127, Math.round(hit.velocity * velScale)));

      // Calculate interpolated pitch cents
      let pitchCents: number | undefined;
      if (roll.pitchCurve) {
        const { startCents, endCents } = roll.pitchCurve;
        pitchCents =
          rollCount > 1
            ? startCents + (endCents - startCents) * (subIndex / (rollCount - 1))
            : startCents;
      }

      events.push({
        eventId: `drum-${hit.drum}-s${hit.step}-sub${subIndex}`,
        trackId: "drums",
        instrument: hit.drum,
        step: hit.step,
        subIndex,
        timeSeconds,
        velocity,
        microTimingMs,
        pitchCents,
        pitchCurve: roll.pitchCurve,
        filterCurve: roll.filterCurve,
      });
    }
  }

  // Deterministic chronological ordering with subIndex stability
  return events.sort((a, b) => {
    if (Math.abs(a.timeSeconds - b.timeSeconds) > 1e-7) {
      return a.timeSeconds - b.timeSeconds;
    }
    if (a.step !== b.step) {
      return a.step - b.step;
    }
    return a.subIndex - b.subIndex;
  });
}
