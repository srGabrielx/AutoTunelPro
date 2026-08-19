<<<<<<< HEAD
import {
  MIDI_EXPORT_PPQ,
  buildCanonicalTimeline,
  canonicalTicksToMidiTicks,
  type BuildCanonicalTimelineInput,
  type CanonicalTimelineDescriptor,
  type CanonicalTimelineEvent,
} from "../music/canonical-timeline.ts";

interface MidiEvent {
  tick: number;
  priority: number;
  data: number[];
}

export interface CreateMidiFileOptions extends BuildCanonicalTimelineInput {
  timeline?: CanonicalTimelineDescriptor;
}

export interface MidiExportArtifact {
  data: Uint8Array;
  timeline: CanonicalTimelineDescriptor;
}

function writeVarLength(input: number): number[] {
  let value = Math.max(0, Math.round(input));
=======
import type { ArrangementBlockData } from "../workers/protocol";
import type { BassResult, DrumResult, MelodyLayer } from "../music/types";
import { buildGrooveEventPlan } from "../music/groove-plan.ts";

// Helper to write Variable-Length Quantities in MIDI
function writeVarLength(value: number): number[] {
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  let buffer = value & 0x7f;
  const bytes: number[] = [];

  while ((value >>= 7)) {
    buffer <<= 8;
    buffer |= (value & 0x7f) | 0x80;
  }

  while (true) {
    bytes.push(buffer & 0xff);
    if (buffer & 0x80) buffer >>= 8;
    else break;
  }
  return bytes;
}

<<<<<<< HEAD
function numToBytes(num: number, byteCount: number): number[] {
  const bytes: number[] = [];
  for (let index = byteCount - 1; index >= 0; index--) {
    bytes.push((num >> (index * 8)) & 0xff);
=======
// Helper to convert 16-bit / 32-bit numbers to big-endian bytes
function numToBytes(num: number, byteCount: number): number[] {
  const bytes: number[] = [];
  for (let i = byteCount - 1; i >= 0; i--) {
    bytes.push((num >> (i * 8)) & 0xff);
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  }
  return bytes;
}

<<<<<<< HEAD
function stringToBytes(value: string): number[] {
  return Array.from(value, (character) => character.charCodeAt(0));
}

function trackNameEvent(trackName: string): number[] {
  const nameBytes = stringToBytes(trackName);
  return [0x00, 0xff, 0x03, ...writeVarLength(nameBytes.length), ...nameBytes];
}

function buildTrackChunk(events: MidiEvent[], trackName: string, endTick: number): number[] {
  const sorted = [...events]
    .filter((event) => event.tick >= 0 && event.tick <= endTick)
    .sort((left, right) => left.tick - right.tick || left.priority - right.priority);
  const trackBytes = trackNameEvent(trackName);
  let lastTick = 0;

  for (const event of sorted) {
    const delta = Math.max(0, event.tick - lastTick);
    lastTick = event.tick;
    trackBytes.push(...writeVarLength(delta), ...event.data);
  }

  // Every Format-1 track has the exact same musical boundary, including the tempo track.
  trackBytes.push(...writeVarLength(Math.max(0, endTick - lastTick)), 0xff, 0x2f, 0x00);

  return [
    ...stringToBytes("MTrk"),
    ...numToBytes(trackBytes.length, 4),
    ...trackBytes,
  ];
}

function melodyChannel(index: number): number {
  // Reserve channel 9 for GM drums and channel 8 for bass.
  const channels = [0, 1, 2, 3, 4, 5, 6, 7, 10, 11, 12, 13, 14, 15];
  return channels[index % channels.length];
}

function compileNoteEvents(
  events: CanonicalTimelineEvent[],
  channel: number,
  arrangementEndTick: number
): MidiEvent[] {
  const noteOn = 0x90 | channel;
  const noteOff = 0x80 | channel;
  const compiled: MidiEvent[] = [];

  for (const event of events) {
    const startTick = Math.min(
      Math.max(0, arrangementEndTick - 1),
      canonicalTicksToMidiTicks(event.startTick)
    );
    const endTick = Math.min(
      arrangementEndTick,
      Math.max(startTick + 1, canonicalTicksToMidiTicks(event.endTick))
    );
    compiled.push({
      tick: startTick,
      priority: 1,
      data: [noteOn, event.pitch, event.velocity],
    });
    compiled.push({
      tick: endTick,
      priority: 0,
      data: [noteOff, event.pitch, 0],
    });
  }

  return compiled;
}

/**
 * Compiles a Format-1 MIDI artifact from the same serializable timeline consumed by WAV.
 * The 960 -> 480 PPQ conversion is deliberate and happens only at this target boundary.
 */
export function createMidiExport(options: CreateMidiFileOptions): MidiExportArtifact {
  const timeline = options.timeline ?? buildCanonicalTimeline(options);
  const tempoMicroseconds = Math.round(60_000_000 / timeline.bpm);
  const arrangementEndTick = canonicalTicksToMidiTicks(timeline.arrangementEndTick);
  const tracks: number[][] = [];

  const tempoEvents: MidiEvent[] = [
    {
      tick: 0,
      priority: 0,
      data: [0xff, 0x51, 0x03, ...numToBytes(tempoMicroseconds, 3)],
    },
    {
      tick: 0,
      priority: 1,
      data: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08],
    },
  ];
  tracks.push(buildTrackChunk(tempoEvents, "Tempo Track", arrangementEndTick));

  let melodyIndex = 0;
  for (const track of timeline.tracks) {
    const trackEvents = timeline.events.filter((event) => event.trackId === track.id);
    if (track.role === "melody") {
      tracks.push(
        buildTrackChunk(
          compileNoteEvents(trackEvents, melodyChannel(melodyIndex++), arrangementEndTick),
          track.label,
          arrangementEndTick
        )
      );
    } else if (track.role === "bass") {
      tracks.push(
        buildTrackChunk(
          compileNoteEvents(trackEvents, 8, arrangementEndTick),
          track.label,
          arrangementEndTick
        )
      );
    } else {
      tracks.push(
        buildTrackChunk(
          compileNoteEvents(trackEvents, 9, arrangementEndTick),
          track.label,
          arrangementEndTick
        )
      );
    }
  }

  const header = [
    ...stringToBytes("MThd"),
    ...numToBytes(6, 4),
    ...numToBytes(1, 2),
    ...numToBytes(tracks.length, 2),
    ...numToBytes(MIDI_EXPORT_PPQ, 2),
  ];
  const totalLength = tracks.reduce((length, track) => length + track.length, header.length);
  const data = new Uint8Array(totalLength);
  data.set(header, 0);
  let offset = header.length;
  for (const track of tracks) {
    data.set(track, offset);
    offset += track.length;
  }

  return { data, timeline };
}

/** Backward-compatible binary-only API. */
export function createMidiFile(options: CreateMidiFileOptions): Uint8Array {
  return createMidiExport(options).data;
}

/** Main-thread only: downloads the MIDI data as a file. */
export function downloadMidiBlob(
  data: Uint8Array | ArrayBuffer,
  filename = "AutoTunel-Beat.mid"
) {
=======
function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

interface MidiEvent {
  tick: number;
  data: number[];
}

/**
 * Pure binary MIDI Format 1 compiler.
 * Safe to execute inside Web Worker, Node.js, and browser main thread.
 */
export function createMidiFile({
  bpm,
  melodyLayers,
  blocks = [],
  muteBass,
  muteDrums,
}: {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  blocks?: ArrangementBlockData[];
  muteBass?: boolean;
  muteDrums?: boolean;
}): Uint8Array {
  const TICKS_PER_BEAT = 480;
  const TICKS_PER_STEP = 120; // 16th note
  const STEPS_PER_BLOCK = 16;

  // Microseconds per quarter note: 60,000,000 / BPM
  const tempoMicroseconds = Math.round(60_000_000 / (bpm || 140));

  // --- Track 0: Tempo & Meta ---
  const tempoTrackEvents: MidiEvent[] = [
    // Tempo meta event: FF 51 03 [3-byte tempo]
    {
      tick: 0,
      data: [0xff, 0x51, 0x03, ...numToBytes(tempoMicroseconds, 3)],
    },
    // Time Signature 4/4: FF 58 04 04 02 18 08
    {
      tick: 0,
      data: [0xff, 0x58, 0x04, 0x04, 0x02, 0x18, 0x08],
    },
    // Track Name: "AutoTunel Master"
    {
      tick: 0,
      data: [0xff, 0x03, 16, ...stringToBytes("AutoTunel Master")],
    },
  ];

  // Helper to compile sorted events to track byte chunk
  function buildTrackChunk(events: MidiEvent[], trackName: string): number[] {
    const sorted = [...events].sort((a, b) => a.tick - b.tick);
    const trackBytes: number[] = [];

    // Track Name Meta
    if (trackName) {
      const nameBytes = stringToBytes(trackName);
      trackBytes.push(0x00, 0xff, 0x03, nameBytes.length, ...nameBytes);
    }

    let lastTick = 0;
    sorted.forEach((event) => {
      const delta = Math.max(0, event.tick - lastTick);
      lastTick = event.tick;
      trackBytes.push(...writeVarLength(delta));
      trackBytes.push(...event.data);
    });

    // End of track: FF 2F 00
    trackBytes.push(0x00, 0xff, 0x2f, 0x00);

    // MTrk header + 4-byte length + track data
    return [
      ...stringToBytes("MTrk"),
      ...numToBytes(trackBytes.length, 4),
      ...trackBytes,
    ];
  }

  const tracks: number[][] = [];
  tracks.push(buildTrackChunk(tempoTrackEvents, "Tempo Track"));

  const activeLayers = (melodyLayers ?? []).filter(
    (layer) => !layer.muted && layer.result && layer.result.notes.length > 0
  );

  activeLayers.forEach((layer, idx) => {
    const channel = Math.min(idx, 3); // MIDI channels 0-3 for melody layers
    const noteOn = 0x90 | channel;
    const noteOff = 0x80 | channel;
    const events: MidiEvent[] = [];

    blocks.forEach((block, blockIdx) => {
      const blockStepOffset = blockIdx * STEPS_PER_BLOCK;
      const melodyResult = block.melodyResults.find((m) => m.layerId === layer.id)?.result;
      if (!melodyResult) return;

      melodyResult.notes.forEach((note) => {
        const startTick = (blockStepOffset + note.step) * TICKS_PER_STEP;
        const durationTicks = Math.max(1, note.duration || 1) * TICKS_PER_STEP - 10;
        const endTick = startTick + durationTicks;

        events.push({
          tick: startTick,
          data: [noteOn, note.note, Math.min(127, Math.max(1, note.velocity))],
        });
        events.push({
          tick: endTick,
          data: [noteOff, note.note, 0],
        });
      });
    });

    const trackLabel = `Melody ${layer.label} (${layer.synthType})`;
    tracks.push(buildTrackChunk(events, trackLabel));
  });

  // --- Track 2: 808 Bass (Channel 1) ---
  if (!muteBass) {
    const bassEvents: MidiEvent[] = [];
    blocks.forEach((block, blockIdx) => {
      const blockStepOffset = blockIdx * STEPS_PER_BLOCK;
      if (!block.bass || !block.bass.notes) return;
      
      block.bass.notes.forEach((note) => {
        const startTick = (blockStepOffset + note.step) * TICKS_PER_STEP;
        const durationTicks = Math.max(1, note.duration || 2) * TICKS_PER_STEP - 10;
        const endTick = startTick + durationTicks;

        // Note On: 91 [note] [velocity]
        bassEvents.push({
          tick: startTick,
          data: [0x91, note.note, Math.min(127, Math.max(1, note.velocity))],
        });
        // Note Off: 81 [note] 00
        bassEvents.push({
          tick: endTick,
          data: [0x81, note.note, 0],
        });
      });
    });
    if (bassEvents.length > 0) {
      tracks.push(buildTrackChunk(bassEvents, "808 Bass"));
    }
  }

  // --- Track 3: Drums (Channel 9 / 10 in standard 1-index) ---
  if (!muteDrums) {
    const drumEvents: MidiEvent[] = [];
    const GM_MAP: Record<string, number> = {
      kick: 36,      // Bass Drum 1
      snare: 38,     // Acoustic Snare
      clap: 39,      // Hand Clap
      hat: 42,       // Closed Hi-Hat
      "open-hat": 46, // Open Hi-Hat
    };

    const stepDuration = 60 / (bpm || 140) / 4;

    blocks.forEach((block, blockIdx) => {
      const blockTimeOffset = blockIdx * (STEPS_PER_BLOCK * stepDuration);
      if (!block.drums || !block.drums.hits) return;

      const grooveEvents = buildGrooveEventPlan({
        hits: block.drums.hits,
        bpm: bpm || 140,
        patternDurationSteps: STEPS_PER_BLOCK,
      });

      grooveEvents.forEach((ev) => {
        const midiPitch = GM_MAP[ev.instrument] || 36;
        const globalTimeSeconds = blockTimeOffset + ev.timeSeconds;
        const startTick = Math.round((globalTimeSeconds / stepDuration) * TICKS_PER_STEP);
        const durationTicks = 60; // 32nd note trigger

        // Note On: 99 [pitch] [velocity]
        drumEvents.push({
          tick: startTick,
          data: [0x99, midiPitch, Math.min(127, Math.max(1, ev.velocity))],
        });
        // Note Off: 89 [pitch] 00
        drumEvents.push({
          tick: startTick + durationTicks,
          data: [0x89, midiPitch, 0],
        });
      });
    });
    
    if (drumEvents.length > 0) {
      tracks.push(buildTrackChunk(drumEvents, "Trap Drums"));
    }
  }

  // --- Header Chunk: MThd + format 1 + track count + division ---
  const header = [
    ...stringToBytes("MThd"),
    ...numToBytes(6, 4), // Header length (always 6)
    ...numToBytes(1, 2), // Format 1 (multi-track)
    ...numToBytes(tracks.length, 2), // Number of tracks
    ...numToBytes(TICKS_PER_BEAT, 2), // 480 Ticks per quarter note
  ];

  const totalLength = tracks.reduce((acc, trk) => acc + trk.length, header.length);
  const fullFile = new Uint8Array(totalLength);

  fullFile.set(header, 0);
  let offset = header.length;
  tracks.forEach((trk) => {
    fullFile.set(trk, offset);
    offset += trk.length;
  });

  return fullFile;
}

/**
 * Main-thread only: downloads the MIDI data as a file.
 */
export function downloadMidiBlob(data: Uint8Array | ArrayBuffer, filename = "AutoTunel-Beat.mid") {
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const blob = new Blob([uint8 as unknown as BlobPart], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
<<<<<<< HEAD
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
=======
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
>>>>>>> 2b08c721b5d612fb29cab029c2a26726dee222e2
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
