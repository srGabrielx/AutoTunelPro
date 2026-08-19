import type {
  BassDrive,
  BassOctave,
  BassResult,
  DrumKitMode,
  DrumPatternMode,
  DrumResult,
  MelodyLayer,
  MelodyResult,
<<<<<<< HEAD
  MelodySynthType,
  ScaleId,
  StyleId,
  TrackSettings,
=======
  ScaleId,
  StyleId,
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
} from "../music/types";

export type ArrangementBlockType = "intro" | "verse" | "drop" | "outro";

export interface ArrangementBlockData {
<<<<<<< HEAD
  /** Stable section identity within this generated snapshot. */
  id: string;
  type: ArrangementBlockType;
  /** Absolute placement; contained note/hit steps remain local to the block. */
  startStep: number;
  durationSteps: number;
  energy: number;
  /** Candidate namespace selected by deterministic scoring. */
  attempt: number;
=======
  type: ArrangementBlockType;
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  bass: BassResult;
  drums: DrumResult;
  melodyResults: Array<{ layerId: string; result: MelodyResult }>;
}

<<<<<<< HEAD
export interface FullCompositionIdentity {
  generationId: string;
  masterSeed: string;
  variationIndex: number;
  attempt: number;
  candidateCount: number;
  schemaVersion: number;
  engineVersion: string;
  presetVersion: number;
  genreId: string;
  styleId: StyleId;
  presetId: string;
  parametersHash: string;
  planHash: string;
  score: number;
}

export interface CompositionTimelineMetadata {
  ppq: 960;
  totalSteps: number;
  endTick: number;
  /** Compatibility name for consumers that already use arrangement bounds. */
  arrangementEndTick: number;
  hash: string;
}

=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
// ==========================================================
// REQUEST PAYLOADS
// ==========================================================

export interface GenerateMelodyPayload {
  layerId: string;
  style: StyleId;
  bpm: number;
  key: string;
  scale: ScaleId;
  complexity: number;
  seed?: number;
<<<<<<< HEAD
  /**
   * When present, regeneration is resolved inside the already-selected
   * composition plan instead of calling the standalone legacy engine.
   */
  context?: SelectiveGenerationContext;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export interface GenerateBassPayload {
  style: StyleId;
  bpm: number;
  key: string;
  scale: ScaleId;
  bassOctave: BassOctave;
  complexity: number;
  seed?: number;
<<<<<<< HEAD
  context?: SelectiveGenerationContext;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export interface GenerateDrumsPayload {
  style: StyleId;
  bpm: number;
  drumPattern: DrumPatternMode;
  complexity: number;
  swing?: number;
  rollDensity?: number;
  humanize?: number;
  seed?: number;
<<<<<<< HEAD
  context?: SelectiveGenerationContext;
}

export interface GenerateAllPayload {
  presetId?: string;
=======
}

export interface GenerateAllPayload {
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  bpm: number;
  key: string;
  globalScale: ScaleId;
  complexity: number;
  bassStyle: StyleId;
  bassOctave: BassOctave;
  drumStyle: StyleId;
  drumPattern: DrumPatternMode;
  swing?: number;
  rollDensity?: number;
  humanize?: number;
  melodyLayers: Array<{
    id: string;
<<<<<<< HEAD
    label?: string;
    synthType?: MelodySynthType;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
    style: StyleId;
    key: string;
    scale: ScaleId;
    muted: boolean;
  }>;
  seed?: number;
<<<<<<< HEAD
  variationIndex?: number;
  candidateCount?: number;
  versions?: {
    schemaVersion?: number;
    engineVersion?: string;
    presetVersion?: number;
  };
}

/**
 * Complete provenance required to regenerate one track without severing it
 * from the harmonic/rhythmic plan selected for the containing snapshot.
 */
export interface SelectiveGenerationContext {
  composition: GenerateAllPayload;
  identity: FullCompositionIdentity;
  block: ArrangementBlockData;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export interface ExportMidiPayload {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  blocks?: ArrangementBlockData[];
  muteBass?: boolean;
  muteDrums?: boolean;
  filename?: string;
}

export interface ExportWavPayload {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  blocks?: ArrangementBlockData[];
  muteBass?: boolean;
  muteDrums?: boolean;
  loops?: number;
<<<<<<< HEAD
  tailSeconds?: number;
  bassDrive?: BassDrive;
  drumKit?: DrumKitMode;
  trackSettings?: Record<string, TrackSettings>;
=======
  bassDrive?: BassDrive;
  drumKit?: DrumKitMode;
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  filename?: string;
}

export interface CancelPayload {
  targetRequestId: string;
}

// ==========================================================
// DISCRIMINATED REQUEST UNION
// ==========================================================

export type WorkerRequest =
  | { type: "generate-melody"; requestId: string; payload: GenerateMelodyPayload }
  | { type: "generate-bass"; requestId: string; payload: GenerateBassPayload }
  | { type: "generate-drums"; requestId: string; payload: GenerateDrumsPayload }
  | { type: "generate-all"; requestId: string; payload: GenerateAllPayload }
  | { type: "export-midi"; requestId: string; payload: ExportMidiPayload }
  | { type: "export-wav"; requestId: string; payload: ExportWavPayload }
  | { type: "cancel"; requestId: string; payload: CancelPayload };

// ==========================================================
// RESPONSE PAYLOADS
// ==========================================================

export interface GenerateAllResponseData {
  blocks: ArrangementBlockData[];
<<<<<<< HEAD
  identity: FullCompositionIdentity;
  timeline: CompositionTimelineMetadata;
}

/** Contextual drum regeneration also rebuilds its declared bass dependent. */
export interface GenerateDrumsResponseData extends DrumResult {
  dependentBass?: BassResult;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export interface ExportFileResponseData {
  buffer: ArrayBuffer;
  filename: string;
  byteLength: number;
<<<<<<< HEAD
  timelineHash: string;
  arrangementEndTick: number;
  durationSeconds: number;
=======
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
}

export type WorkerSuccessResponse =
  | { type: "generate-melody"; requestId: string; success: true; data: MelodyResult; layerId: string }
  | { type: "generate-bass"; requestId: string; success: true; data: BassResult }
<<<<<<< HEAD
  | { type: "generate-drums"; requestId: string; success: true; data: GenerateDrumsResponseData }
=======
  | { type: "generate-drums"; requestId: string; success: true; data: DrumResult }
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  | { type: "generate-all"; requestId: string; success: true; data: GenerateAllResponseData }
  | { type: "export-midi"; requestId: string; success: true; data: ExportFileResponseData }
  | { type: "export-wav"; requestId: string; success: true; data: ExportFileResponseData }
  | { type: "cancel"; requestId: string; success: true; data: { cancelledRequestId: string } };

export interface WorkerErrorResponse {
  requestId: string;
  success: false;
  error: {
    message: string;
    engine?: "melody" | "bass" | "drums" | "all" | "midi" | "wav";
    code?: string;
  };
}

export type WorkerResponse = WorkerSuccessResponse | WorkerErrorResponse;
