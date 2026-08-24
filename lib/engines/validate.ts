import { STYLES, SCALES, KEYS } from "../music/styles";
import type { BassOctave, DrumPatternMode, GenerateOptions, MelodySynthType, ScaleId, StyleId } from "../music/types";

const VALID_SYNTH_TYPES: MelodySynthType[] = ["lead", "pad", "pluck", "arp"];
const VALID_DRUM_PATTERNS: DrumPatternMode[] = ["standard", "half-time", "double-time", "triplet-rolls"];
const VALID_BASS_OCTAVES: BassOctave[] = [-36, -24, -12];

export function parseOptions(body: unknown): GenerateOptions {
  const value = (body && typeof body === "object" ? body : {}) as Record<string, unknown>;
  const style = (typeof value.style === "string" && value.style in STYLES ? value.style : "trap-br") as StyleId;
  const bpm = Math.min(300, Math.max(40, Number.isFinite(Number(value.bpm)) ? Number(value.bpm) : STYLES[style].bpm[0]));
  const complexity = Math.min(5, Math.max(1, Number.isFinite(Number(value.complexity)) ? Math.round(Number(value.complexity)) : 3));
  const seed = value.seed != null && Number.isFinite(Number(value.seed)) ? Math.abs(Math.trunc(Number(value.seed))) >>> 0 : undefined;
  const key = typeof value.key === "string" && value.key in KEYS ? value.key : "C";
  const scale = typeof value.scale === "string" && value.scale in SCALES ? (value.scale as ScaleId) : undefined;
  const bassOctave = typeof value.bassOctave === "number" && VALID_BASS_OCTAVES.includes(value.bassOctave as BassOctave) ? (value.bassOctave as BassOctave) : undefined;
  const drumPattern = typeof value.drumPattern === "string" && VALID_DRUM_PATTERNS.includes(value.drumPattern as DrumPatternMode) ? (value.drumPattern as DrumPatternMode) : undefined;
  const swing = typeof value.swing === "number" && Number.isFinite(value.swing) ? Math.max(0, Math.min(100, Math.round(value.swing))) : undefined;
  const rollDensity = typeof value.rollDensity === "number" && Number.isFinite(value.rollDensity) ? Math.max(0, Math.min(100, Math.round(value.rollDensity))) : undefined;
  const humanize = typeof value.humanize === "number" && Number.isFinite(value.humanize) ? Math.max(0, Math.min(100, Math.round(value.humanize))) : undefined;
  const synthType = typeof value.synthType === "string" && VALID_SYNTH_TYPES.includes(value.synthType as MelodySynthType) ? (value.synthType as MelodySynthType) : undefined;

  return {
    style,
    bpm,
    complexity,
    seed,
    key,
    scale,
    synthType,
    bassOctave,
    drumPattern,
    swing,
    rollDensity,
    humanize,
  };
}

