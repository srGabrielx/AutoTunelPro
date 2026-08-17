import { STYLES } from "../music/styles";
import type { BassOctave, DrumPatternMode, GenerateOptions, ScaleId, StyleId } from "../music/types";

export function parseOptions(body: unknown): GenerateOptions {
  const value = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const style = (typeof value.style === "string" && value.style in STYLES ? value.style : "trap-br") as StyleId;
  const bpm = Math.min(300, Math.max(40, Number(value.bpm) || STYLES[style].bpm[0]));
  const complexity = Math.min(5, Math.max(1, Number(value.complexity) || 3));
  const seed = value.seed == null ? undefined : Number(value.seed);
  const key = typeof value.key === "string" ? value.key : "C";
  const scale = typeof value.scale === "string" ? (value.scale as ScaleId) : undefined;
  const bassOctave = typeof value.bassOctave === "number" ? (value.bassOctave as BassOctave) : undefined;
  const drumPattern = typeof value.drumPattern === "string" ? (value.drumPattern as DrumPatternMode) : undefined;
  const swing = typeof value.swing === "number" ? Math.max(0, Math.min(100, value.swing)) : undefined;
  const rollDensity = typeof value.rollDensity === "number" ? Math.max(0, Math.min(100, value.rollDensity)) : undefined;
  const humanize = typeof value.humanize === "number" ? Math.max(0, Math.min(100, value.humanize)) : undefined;

  return {
    style,
    bpm,
    complexity,
    seed,
    key,
    scale,
    bassOctave,
    drumPattern,
    swing,
    rollDensity,
    humanize,
  };
}

