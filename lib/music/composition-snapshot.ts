import type {
  ArrangementBlockData,
  CompositionTimelineMetadata,
  FullCompositionIdentity,
} from "../workers/protocol";
import type {
  BassDrive,
  BassOctave,
  DrumKitMode,
  DrumPatternMode,
  MelodyLayer,
  ScaleId,
  StyleId,
  TrackSettings,
} from "./types";

export const COMPOSITION_SNAPSHOT_VERSION = 2 as const;

export interface CompositionControlSnapshot {
  artistPreset: string;
  bpm: number;
  key: string;
  globalScale: ScaleId;
  complexity: number;
  bassStyle: StyleId;
  bassOctave: BassOctave;
  bassDrive: BassDrive;
  drumStyle: StyleId;
  drumPattern: DrumPatternMode;
  drumKit: DrumKitMode;
  swing: number;
  rollDensity: number;
  humanize: number;
  muteBass: boolean;
  muteDrums: boolean;
  isLooping: boolean;
}

export interface CompositionSessionSnapshot {
  snapshotVersion: typeof COMPOSITION_SNAPSHOT_VERSION;
  /** CID of this exact editable snapshot; source generation stays in identity. */
  compositionId: string;
  seed: number;
  seedLocked: boolean;
  variationIndex: number;
  identity: FullCompositionIdentity;
  timeline: CompositionTimelineMetadata;
  controls: CompositionControlSnapshot;
  melodyLayers: MelodyLayer[];
  trackSettings: Record<string, TrackSettings>;
  blocks: ArrangementBlockData[];
  currentBlockId: string;
}

interface CompositionSnapshotEnvelope {
  snapshot: CompositionSessionSnapshot;
  snapshotHash: string;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function fnv1a(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createCompositionSnapshotHash(snapshot: CompositionSessionSnapshot): string {
  return `snapshot-${fnv1a(JSON.stringify(stableValue(snapshot)))}`;
}

export function createCompositionContentId(snapshot: CompositionSessionSnapshot): string {
  const { compositionId: _ignored, ...content } = snapshot;
  return `composition-${fnv1a(JSON.stringify(stableValue(content)))}`;
}

export function serializeCompositionSnapshot(snapshot: CompositionSessionSnapshot): string {
  const envelope: CompositionSnapshotEnvelope = {
    snapshot,
    snapshotHash: createCompositionSnapshotHash(snapshot),
  };
  return JSON.stringify(envelope);
}

function isSessionSnapshot(value: unknown): value is CompositionSessionSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<CompositionSessionSnapshot>;
  return snapshot.snapshotVersion === COMPOSITION_SNAPSHOT_VERSION
    && typeof snapshot.compositionId === "string"
    && snapshot.compositionId.length > 0
    && Number.isInteger(snapshot.seed)
    && Number.isInteger(snapshot.variationIndex)
    && typeof snapshot.seedLocked === "boolean"
    && Boolean(snapshot.identity?.generationId)
    && Boolean(snapshot.timeline?.hash)
    && Boolean(snapshot.controls)
    && Array.isArray(snapshot.melodyLayers)
    && Array.isArray(snapshot.blocks)
    && snapshot.blocks.length > 0
    && typeof snapshot.currentBlockId === "string";
}

export function deserializeCompositionSnapshot(serialized: string): CompositionSessionSnapshot | null {
  try {
    const parsed = JSON.parse(serialized) as Partial<CompositionSnapshotEnvelope>;
    if (!isSessionSnapshot(parsed.snapshot) || typeof parsed.snapshotHash !== "string") return null;
    if (createCompositionSnapshotHash(parsed.snapshot) !== parsed.snapshotHash) return null;
    return parsed.snapshot;
  } catch {
    return null;
  }
}
