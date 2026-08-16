export type StyleId = "trap-br" | "trap-uk" | "trap-usa" | "hip-hop" | "funk" | "amapiano";

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
  | "akon-lonely"
  | "travis-sicko"
  | "drake-night"
  | "metro-cinematic"
  | "post-rockstar"
  | "matue-trapbr"
  | "funk-mandelao"
  | "kabza-amapiano"
  | "reggae-bob"
  | "para-melody";

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
}

export interface DrumHit {
  step: number;
  drum: "kick" | "snare" | "hat" | "open-hat";
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
