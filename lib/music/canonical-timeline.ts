import { buildGrooveEventPlan } from "./groove-plan.ts";
import type {
  BassResult,
  DrumResult,
  MelodyLayer,
  MelodyResult,
  MelodySynthType,
} from "./types";
import type { ArrangementBlockType } from "../workers/protocol";

/** Internal composition clock. File MIDI deliberately uses half this resolution. */
export const CANONICAL_PPQ = 960 as const;
export const MIDI_EXPORT_PPQ = 480 as const;
export const STEPS_PER_QUARTER = 4 as const;
export const TICKS_PER_STEP = CANONICAL_PPQ / STEPS_PER_QUARTER;
export const DEFAULT_SECTION_DURATION_STEPS = 16 as const;
export const MAX_BPM = 300 as const;
export const MIN_BPM = 40 as const;
export const BASS_GLIDE_OVERLAP_TICKS = TICKS_PER_STEP / 4;

export interface CanonicalArrangementBlockInput {
  id?: string;
  type: ArrangementBlockType;
  startStep?: number;
  durationSteps?: number;
  bass: BassResult;
  drums: DrumResult;
  melodyResults: Array<{ layerId: string; result: MelodyResult }>;
}

type TimelineArrangementBlock = CanonicalArrangementBlockInput & {
  id?: unknown;
  startStep?: unknown;
  durationSteps?: unknown;
};

type SourceWithOptionalId = { id?: unknown };

export type CanonicalTrackRole = "melody" | "bass" | "drums";

export interface CanonicalTimelineBlock {
  id: string;
  type: ArrangementBlockType;
  sourceIndex: number;
  startStep: number;
  durationSteps: number;
  startTick: number;
  endTick: number;
}

export interface CanonicalTimelineTrack {
  id: string;
  role: CanonicalTrackRole;
  label: string;
  synthType?: MelodySynthType;
}

export interface CanonicalTimelineEvent {
  id: string;
  kind: "note" | "hit";
  role: CanonicalTrackRole;
  trackId: string;
  sectionId: string;
  sectionStartTick: number;
  sectionEndTick: number;
  startTick: number;
  endTick: number;
  pitch: number;
  velocity: number;
  sourceId?: string;
  instrument?: "kick" | "snare" | "clap" | "hat" | "open-hat";
  subIndex?: number;
  microTimingMs?: number;
  pitchCents?: number;
  filterCurve?: {
    startHz: number;
    endHz: number;
    durationMs: number;
  };
  slide?: boolean;
}

export interface CanonicalTimelineDescriptor {
  version: 1;
  ppq: typeof CANONICAL_PPQ;
  bpm: number;
  ticksPerStep: number;
  arrangementStartTick: 0;
  arrangementEndTick: number;
  durationSeconds: number;
  blocks: CanonicalTimelineBlock[];
  tracks: CanonicalTimelineTrack[];
  events: CanonicalTimelineEvent[];
  timelineHash: string;
}

export interface BuildCanonicalTimelineInput {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  blocks?: CanonicalArrangementBlockInput[];
  muteBass?: boolean;
  muteDrums?: boolean;
}

interface NormalizedBlock extends CanonicalTimelineBlock {
  source: TimelineArrangementBlock | null;
}

type PendingEvent = Omit<CanonicalTimelineEvent, "id">;

export function sanitizeBpm(bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) return 140;
  return Math.max(MIN_BPM, Math.min(MAX_BPM, bpm));
}

export function stepsToTicks(steps: number): number {
  return Math.round(steps * TICKS_PER_STEP);
}

export function ticksToSteps(ticks: number): number {
  return ticks / TICKS_PER_STEP;
}

export function ticksToSeconds(ticks: number, bpm: number): number {
  return (ticks / CANONICAL_PPQ) * (60 / sanitizeBpm(bpm));
}

export function secondsToTicks(seconds: number, bpm: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round((seconds * sanitizeBpm(bpm) * CANONICAL_PPQ) / 60);
}

export type SampleRounding = "round" | "floor" | "ceil";

export function secondsToSamples(
  seconds: number,
  sampleRate: number,
  rounding: SampleRounding = "round"
): number {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const safeSampleRate = Number.isFinite(sampleRate) ? Math.max(1, sampleRate) : 44_100;
  return Math[rounding](safeSeconds * safeSampleRate);
}

export function ticksToSamples(
  ticks: number,
  bpm: number,
  sampleRate: number,
  rounding: SampleRounding = "round"
): number {
  return secondsToSamples(ticksToSeconds(ticks, bpm), sampleRate, rounding);
}

export function samplesToTicks(samples: number, bpm: number, sampleRate: number): number {
  const safeSampleRate = Number.isFinite(sampleRate) ? Math.max(1, sampleRate) : 44_100;
  return secondsToTicks(Math.max(0, samples) / safeSampleRate, bpm);
}

export function canonicalTicksToMidiTicks(ticks: number): number {
  return Math.round((ticks * MIDI_EXPORT_PPQ) / CANONICAL_PPQ);
}

export function midiTicksToCanonicalTicks(ticks: number): number {
  return Math.round((ticks * CANONICAL_PPQ) / MIDI_EXPORT_PPQ);
}

export function timelineDurationSamples(
  timeline: CanonicalTimelineDescriptor,
  sampleRate: number,
  options: { passes?: number; tailSeconds?: number } = {}
): number {
  const passes = normalizePositiveInteger(options.passes, 1);
  const tailSeconds = normalizeNonNegativeNumber(options.tailSeconds, 0);
  const durationSeconds = timeline.durationSeconds * passes + tailSeconds;
  return secondsToSamples(durationSeconds, sampleRate, "ceil");
}

function normalizePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return fallback;
  return Math.max(1, Math.floor(value));
}

function normalizeNonNegativeInteger(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function normalizeNonNegativeNumber(value: unknown, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return fallback;
  return value;
}

function normalizeSourceId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function clampMidiByte(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(127, Math.round(value)));
}

function clampVelocity(value: number): number {
  return Math.max(1, clampMidiByte(value, 1));
}

function normalizeBlocks(
  blocks: CanonicalArrangementBlockInput[] | undefined
): NormalizedBlock[] {
  if (!blocks || blocks.length === 0) {
    return [
      {
        id: "section-0",
        type: "verse",
        sourceIndex: 0,
        startStep: 0,
        durationSteps: DEFAULT_SECTION_DURATION_STEPS,
        startTick: 0,
        endTick: stepsToTicks(DEFAULT_SECTION_DURATION_STEPS),
        source: null,
      },
    ];
  }

  const ids = new Map<string, number>();
  const normalized: NormalizedBlock[] = [];
  let cursorStep = 0;

  blocks.forEach((rawBlock, sourceIndex) => {
    const source = rawBlock as TimelineArrangementBlock;
    const startStep = normalizeNonNegativeInteger(source.startStep, cursorStep);
    const durationSteps = normalizePositiveInteger(
      source.durationSteps,
      DEFAULT_SECTION_DURATION_STEPS
    );
    const baseId = normalizeSourceId(source.id) ?? `${source.type}-${sourceIndex}`;
    const occurrence = ids.get(baseId) ?? 0;
    ids.set(baseId, occurrence + 1);
    const id = occurrence === 0 ? baseId : `${baseId}#${occurrence + 1}`;
    const endStep = startStep + durationSteps;

    normalized.push({
      id,
      type: source.type,
      sourceIndex,
      startStep,
      durationSteps,
      startTick: stepsToTicks(startStep),
      endTick: stepsToTicks(endStep),
      source,
    });
    cursorStep = Math.max(cursorStep, endStep);
  });

  return normalized.sort(
    (left, right) => left.startTick - right.startTick || left.sourceIndex - right.sourceIndex
  );
}

function eventDedupeKey(event: PendingEvent): string {
  const explicitIntent = event.sourceId ? `source:${event.sourceId}` : "anonymous";
  return [
    event.kind,
    event.role,
    event.trackId,
    event.sectionId,
    event.startTick,
    event.endTick,
    event.pitch,
    event.velocity,
    event.instrument ?? "",
    event.subIndex ?? "",
    event.microTimingMs ?? "",
    event.pitchCents ?? "",
    event.slide ? 1 : 0,
    explicitIntent,
  ].join("|");
}

function sortEvents(left: PendingEvent, right: PendingEvent): number {
  return (
    left.startTick - right.startTick ||
    left.endTick - right.endTick ||
    left.trackId.localeCompare(right.trackId) ||
    left.pitch - right.pitch ||
    (left.subIndex ?? -1) - (right.subIndex ?? -1) ||
    (left.sourceId ?? "").localeCompare(right.sourceId ?? "")
  );
}

function removeExactUnintentionalDuplicates(events: PendingEvent[]): PendingEvent[] {
  const seen = new Set<string>();
  const unique: PendingEvent[] = [];
  for (const event of [...events].sort(sortEvents)) {
    const key = eventDedupeKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

function enforceMonophonicBass(events: PendingEvent[]): PendingEvent[] {
  const nonBass = events.filter((event) => event.role !== "bass");
  const bassByTrack = new Map<string, PendingEvent[]>();

  for (const event of events) {
    if (event.role !== "bass") continue;
    const track = bassByTrack.get(event.trackId) ?? [];
    track.push({ ...event });
    bassByTrack.set(event.trackId, track);
  }

  for (const track of bassByTrack.values()) {
    track.sort(sortEvents);
    const monophonic: PendingEvent[] = [];

    for (const event of track) {
      const previous = monophonic.at(-1);
      if (!previous) {
        monophonic.push(event);
        continue;
      }

      if (event.startTick === previous.startTick) {
        const shouldReplace =
          (event.slide === true && previous.slide !== true) ||
          (event.slide === previous.slide && event.velocity > previous.velocity);
        if (shouldReplace) monophonic[monophonic.length - 1] = event;
        continue;
      }

      if (event.startTick < previous.endTick) {
        previous.endTick = event.slide
          ? Math.min(previous.endTick, event.startTick + BASS_GLIDE_OVERLAP_TICKS)
          : event.startTick;
        if (previous.endTick <= previous.startTick) monophonic.pop();
      }
      monophonic.push(event);
    }

    nonBass.push(...monophonic);
  }

  return nonBass.sort(sortEvents);
}

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function computeTimelineHash(
  timeline: Omit<CanonicalTimelineDescriptor, "timelineHash">
): string {
  return `timeline-v1-${hashString(JSON.stringify(timeline))}`;
}

function finalizeEvents(events: PendingEvent[]): CanonicalTimelineEvent[] {
  return enforceMonophonicBass(removeExactUnintentionalDuplicates(events)).map(
    (event, index) => ({
      ...event,
      id: `${event.sectionId}:${event.trackId}:${event.kind}:${event.startTick}:${
        event.subIndex ?? 0
      }:${index}`,
    })
  );
}

/**
 * The only arrangement interpretation used by export targets. The returned object is
 * serializable and may also be handed directly to a player or live-MIDI target.
 */
export function buildCanonicalTimeline({
  bpm,
  melodyLayers = [],
  blocks,
  muteBass = false,
  muteDrums = false,
}: BuildCanonicalTimelineInput): CanonicalTimelineDescriptor {
  const safeBpm = sanitizeBpm(bpm);
  const normalizedBlocks = normalizeBlocks(blocks);
  const arrangementEndTick = Math.max(...normalizedBlocks.map((block) => block.endTick));
  const tracks: CanonicalTimelineTrack[] = [];
  const pendingEvents: PendingEvent[] = [];

  const activeLayers = melodyLayers.filter((layer) => {
    if (layer.muted) return false;
    if ((layer.result?.notes.length ?? 0) > 0) return true;
    return normalizedBlocks.some((block) =>
      block.source?.melodyResults.some(
        (entry) => entry.layerId === layer.id && entry.result.notes.length > 0
      )
    );
  });

  for (const layer of activeLayers) {
    if (!tracks.some((track) => track.id === layer.id)) {
      tracks.push({
        id: layer.id,
        role: "melody",
        label: `Melody ${layer.label} (${layer.synthType})`,
        synthType: layer.synthType,
      });
    }

    for (const block of normalizedBlocks) {
      const notes = block.source
        ? block.source.melodyResults.find((entry) => entry.layerId === layer.id)?.result.notes ?? []
        : layer.result?.notes ?? [];

      for (const note of notes) {
        if (!Number.isFinite(note.step) || note.step < 0) continue;
        const localStartTick = stepsToTicks(note.step);
        if (localStartTick < 0 || localStartTick >= block.endTick - block.startTick) continue;
        const durationSteps =
          Number.isFinite(note.duration) && note.duration > 0 ? note.duration : 1;
        const startTick = block.startTick + localStartTick;
        const endTick = Math.min(
          block.endTick,
          startTick + Math.max(1, stepsToTicks(durationSteps))
        );
        if (endTick <= startTick) continue;

        pendingEvents.push({
          kind: "note",
          role: "melody",
          trackId: layer.id,
          sectionId: block.id,
          sectionStartTick: block.startTick,
          sectionEndTick: block.endTick,
          startTick,
          endTick,
          pitch: clampMidiByte(note.note, 60),
          velocity: clampVelocity(note.velocity),
          sourceId: normalizeSourceId((note as SourceWithOptionalId).id),
        });
      }
    }
  }

  const hasArrangementBass = normalizedBlocks.some((block) => block.source?.bass != null);
  if (!muteBass && hasArrangementBass) {
    tracks.push({ id: "bass", role: "bass", label: "808 Bass" });
    for (const block of normalizedBlocks) {
      for (const note of block.source?.bass.notes ?? []) {
        if (!Number.isFinite(note.step) || note.step < 0) continue;
        const localStartTick = stepsToTicks(note.step);
        if (localStartTick < 0 || localStartTick >= block.endTick - block.startTick) continue;
        const durationSteps =
          Number.isFinite(note.duration) && note.duration > 0 ? note.duration : 2;
        const startTick = block.startTick + localStartTick;
        const endTick = Math.min(
          block.endTick,
          startTick + Math.max(1, stepsToTicks(durationSteps))
        );
        if (endTick <= startTick) continue;

        pendingEvents.push({
          kind: "note",
          role: "bass",
          trackId: "bass",
          sectionId: block.id,
          sectionStartTick: block.startTick,
          sectionEndTick: block.endTick,
          startTick,
          endTick,
          pitch: clampMidiByte(note.note, 36),
          velocity: clampVelocity(note.velocity),
          sourceId: normalizeSourceId((note as SourceWithOptionalId).id),
          slide: note.slide === true,
        });
      }
    }
  }

  const hasArrangementDrums = normalizedBlocks.some((block) => block.source?.drums != null);
  if (!muteDrums && hasArrangementDrums) {
    tracks.push({ id: "drums", role: "drums", label: "Drums" });
    for (const block of normalizedBlocks) {
      for (const hit of block.source?.drums.hits ?? []) {
        const sourceId = normalizeSourceId((hit as SourceWithOptionalId).id);
        const grooveEvents = buildGrooveEventPlan({
          hits: [hit],
          bpm: safeBpm,
          patternDurationSteps: block.durationSteps,
        });

        for (const grooveEvent of grooveEvents) {
          const localStartTick = Math.max(
            0,
            Math.min(
              block.endTick - block.startTick - 1,
              secondsToTicks(grooveEvent.timeSeconds, safeBpm)
            )
          );
          const startTick = block.startTick + localStartTick;
          const endTick = Math.min(block.endTick, startTick + TICKS_PER_STEP / 2);
          const pitch =
            grooveEvent.instrument === "kick"
              ? 36
              : grooveEvent.instrument === "snare"
                ? 38
                : grooveEvent.instrument === "clap"
                  ? 39
                  : grooveEvent.instrument === "open-hat"
                    ? 46
                    : 42;

          pendingEvents.push({
            kind: "hit",
            role: "drums",
            trackId: "drums",
            sectionId: block.id,
            sectionStartTick: block.startTick,
            sectionEndTick: block.endTick,
            startTick,
            endTick,
            pitch,
            velocity: clampVelocity(grooveEvent.velocity),
            sourceId,
            instrument: grooveEvent.instrument,
            subIndex: grooveEvent.subIndex,
            microTimingMs: grooveEvent.microTimingMs,
            pitchCents: grooveEvent.pitchCents,
            filterCurve: grooveEvent.filterCurve,
          });
        }
      }
    }
  }

  const events = finalizeEvents(pendingEvents).filter(
    (event) => event.startTick >= 0 && event.endTick <= arrangementEndTick
  );
  const publicBlocks = normalizedBlocks.map((block) => ({
    id: block.id,
    type: block.type,
    sourceIndex: block.sourceIndex,
    startStep: block.startStep,
    durationSteps: block.durationSteps,
    startTick: block.startTick,
    endTick: block.endTick,
  }));
  const withoutHash: Omit<CanonicalTimelineDescriptor, "timelineHash"> = {
    version: 1,
    ppq: CANONICAL_PPQ,
    bpm: safeBpm,
    ticksPerStep: TICKS_PER_STEP,
    arrangementStartTick: 0,
    arrangementEndTick,
    durationSeconds: ticksToSeconds(arrangementEndTick, safeBpm),
    blocks: publicBlocks,
    tracks,
    events,
  };

  return { ...withoutHash, timelineHash: computeTimelineHash(withoutHash) };
}
