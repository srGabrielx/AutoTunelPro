import type {
  BassDrive,
  BassOctave,
  BassResult,
  DrumKitMode,
  DrumPatternMode,
  DrumResult,
  MelodyLayer,
  MelodyResult,
  ScaleId,
  StyleId,
} from "../music/types";

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
}

export interface GenerateBassPayload {
  style: StyleId;
  bpm: number;
  key: string;
  scale: ScaleId;
  bassOctave: BassOctave;
  complexity: number;
}

export interface GenerateDrumsPayload {
  style: StyleId;
  bpm: number;
  drumPattern: DrumPatternMode;
  complexity: number;
  swing?: number;
  rollDensity?: number;
  humanize?: number;
}

export interface GenerateAllPayload {
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
    style: StyleId;
    key: string;
    scale: ScaleId;
    muted: boolean;
  }>;
}

export interface ExportMidiPayload {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  bass?: BassResult | null;
  drums?: DrumResult | null;
  filename?: string;
}

export interface ExportWavPayload {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  bass?: BassResult | null;
  drums?: DrumResult | null;
  loops?: number;
  bassDrive?: BassDrive;
  drumKit?: DrumKitMode;
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
  bass: BassResult;
  drums: DrumResult;
  melodyResults: Array<{ layerId: string; result: MelodyResult }>;
}

export interface ExportFileResponseData {
  buffer: ArrayBuffer;
  filename: string;
  byteLength: number;
}

export type WorkerSuccessResponse =
  | { type: "generate-melody"; requestId: string; success: true; data: MelodyResult; layerId: string }
  | { type: "generate-bass"; requestId: string; success: true; data: BassResult }
  | { type: "generate-drums"; requestId: string; success: true; data: DrumResult }
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
