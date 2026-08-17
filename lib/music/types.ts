import type { CompositionPlan } from "./composition-plan";

export type StyleId = "trap-br" | "trap-uk" | "trap-usa" | "hip-hop" | "funk" | "amapiano" | "reggae-default" | "boombap-default" | "hiphop-default" | "dubstep-default";

export type ScaleId =
  | "natural-minor"
  | "harmonic-minor"
  | "pentatonic-minor"
  | "natural-major"
  | "pentatonic-major"
  | "dorian"
  | "phrygian"
  | "blues";

export type ArtistPresetId =
  | "custom"
  | "1-matue-kennyg"
  | "2-travis-fein"
  | "3-centralcee-doja"
  | "4-metro-superhero"
  | "5-veigh-novobalanco"
  | "6-drake-richflex"
  | "7-mchariel-mandelao"
  | "8-dennis-taok"
  | "9-drdre-stilldre"
  | "10-post-rockstar"
  | "11-kabza-amapiano"
  | "12-kayblack-melhorvibe";

export type MelodySynthType = "lead" | "pad" | "pluck" | "arp";

export type BassOctave = -36 | -24 | -12; // C0, C1, C2
export type BassDrive = "clean" | "warm" | "overdrive";

export type DrumPatternMode = "standard" | "half-time" | "double-time" | "triplet-rolls";
export type DrumKitMode = "trap-808" | "drill-punch" | "funk-tamborzao" | "boom-bap" | "amapiano-log";

export interface GenerateOptions {
  style: StyleId;
  bpm: number;
  key?: string;
  scale?: ScaleId;
  complexity: number;
  seed?: number;
  bassOctave?: BassOctave;
  drumPattern?: DrumPatternMode;
  swing?: number;       // 0 to 100 %
  rollDensity?: number; // 0 to 100 %
  humanize?: number;    // 0 to 100 %
  compositionPlan?: CompositionPlan; // Injected shared plan for Lote 3+
}

export interface MelodyNote {
  step: number;
  note: number;
  velocity: number;
  duration: number;
}

export interface MelodyResult {
  engine: "melody";
  seed: number;
  style: StyleId;
  bpm: number;
  key: string;
  scale?: ScaleId;
  notes: MelodyNote[];
}

export interface MelodyLayer {
  id: string;
  label: string;
  synthType: MelodySynthType;
  style: StyleId;
  key: string;
  scale: ScaleId;
  muted: boolean;
  result: MelodyResult | null;
}

/** Per-track volume/mute configuration, keyed by track ID */
export interface TrackSettings {
  volume: number;  // 0 to 1, default 0.8
  muted: boolean;
}

/** Discriminated union for individually-added drum element tracks */
export type DrumElementTrack =
  | { id: string; type: "kick";     label: string; hits: DrumHit[] }
  | { id: string; type: "snare";    label: string; hits: DrumHit[] }
  | { id: string; type: "clap";     label: string; hits: DrumHit[] }
  | { id: string; type: "hi-hat";   label: string; hits: DrumHit[] }
  | { id: string; type: "open-hat"; label: string; hits: DrumHit[] };

/** Explicit roll structure for sub-step articulations */
export interface DrumRoll {
  count: 1 | 2 | 3 | 4 | 6; // Number of strokes within the 1/16 step (e.g. 2 = 1/32, 3 = triplet)
  velocityCurve: "crescendo" | "decrescendo" | "flat";
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

export interface DrumHit {
  step: number;
  drum: "kick" | "snare" | "clap" | "hat" | "open-hat";
  velocity: number;
  roll?: DrumRoll;
  microTimingMs?: number; // Bounded ±15ms
}

export interface DrumResult {
  engine: "drums";
  seed: number;
  style: StyleId;
  bpm: number;
  patternMode?: DrumPatternMode;
  hits: DrumHit[];
}

export interface BassNote {
  step: number;
  note: number;
  velocity: number;
  duration: number;
  slide?: boolean;
}

export interface BassResult {
  engine: "bass";
  seed: number;
  style: StyleId;
  bpm: number;
  key: string;
  scale?: ScaleId;
  octaveOffset?: BassOctave;
  notes: BassNote[];
}

export interface HarmonicProfile {
  allowedScales: ScaleId[];
  defaultScale: ScaleId;
  complexity: number;
}

export interface MelodyProfile {
  syncopation: number;
  phraseLengths: number[];
  densityRange: [number, number];
}

export interface BassProfile {
  type: string;
  slideProbability: number;
  syncWithKick: number;
  restProbability?: number;
}

export interface DrumProfile {
  hatRolls: boolean;
  hatRollThreshold?: number;
  kickSyncopation: number;
  kickDensity?: number;
  kickGapMin?: number;
  kickGapMax?: number;
  snareOn?: number[];
  snareDensity?: number;
  snareGapMin?: number;
  snareGapMax?: number;
}

export interface SynthesisProfile {
  808?: { drive: number; attack: number; release: number; };
  sub?: { drive: number; attack: number; release: number; };
  synth?: { drive: number; attack: number; release: number; };
  hats?: { closedDecay: number; openDecay: number; };
}

export interface ArrangementProfile {
  energyCurve: string;
}

