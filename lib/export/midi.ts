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

function numToBytes(num: number, byteCount: number): number[] {
  const bytes: number[] = [];
  for (let index = byteCount - 1; index >= 0; index--) {
    bytes.push((num >> (index * 8)) & 0xff);
  }
  return bytes;
}

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

export interface IndividualMidiFile {
  filename: string;
  data: Uint8Array;
  role: string;
  label: string;
}

/**
 * Exports each instrument / drum piece as an isolated, standalone MIDI file (Tempo Track + Instrument Track).
 * Perfect for dragging individual tracks straight into DAW channels.
 */
export function createIndividualMidiFiles(options: CreateMidiFileOptions): {
  files: IndividualMidiFile[];
  timeline: CanonicalTimelineDescriptor;
} {
  const timeline = options.timeline ?? buildCanonicalTimeline(options);
  const tempoMicroseconds = Math.round(60_000_000 / timeline.bpm);
  const arrangementEndTick = canonicalTicksToMidiTicks(timeline.arrangementEndTick);

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
  const tempoTrackChunk = buildTrackChunk(tempoEvents, "Tempo Track", arrangementEndTick);

  const createSingleTrackMidi = (events: MidiEvent[], label: string): Uint8Array => {
    const trackChunk = buildTrackChunk(events, label, arrangementEndTick);
    const header = [
      ...stringToBytes("MThd"),
      ...numToBytes(6, 4),
      ...numToBytes(1, 2), // Format 1 (Tempo + 1 Track)
      ...numToBytes(2, 2), // 2 Tracks
      ...numToBytes(MIDI_EXPORT_PPQ, 2),
    ];
    const totalLength = header.length + tempoTrackChunk.length + trackChunk.length;
    const data = new Uint8Array(totalLength);
    data.set(header, 0);
    data.set(tempoTrackChunk, header.length);
    data.set(trackChunk, header.length + tempoTrackChunk.length);
    return data;
  };

  const files: IndividualMidiFile[] = [];

  // 1. Melodias
  let melodyIdx = 0;
  for (const track of timeline.tracks.filter((t) => t.role === "melody")) {
    const trackEvents = timeline.events.filter((e) => e.trackId === track.id);
    if (trackEvents.length > 0) {
      const midiEvents = compileNoteEvents(trackEvents, melodyChannel(melodyIdx++), arrangementEndTick);
      const safeLabel = track.label.replace(/[^a-zA-Z0-9_-]/g, "_");
      files.push({
        filename: `${safeLabel}.mid`,
        data: createSingleTrackMidi(midiEvents, track.label),
        role: "melody",
        label: track.label,
      });
    }
  }

  // 2. 808 Bass
  const bassTrack = timeline.tracks.find((t) => t.role === "bass");
  if (bassTrack) {
    const bassEvents = timeline.events.filter((e) => e.trackId === "bass");
    if (bassEvents.length > 0) {
      const midiEvents = compileNoteEvents(bassEvents, 8, arrangementEndTick);
      files.push({
        filename: "808_Bass.mid",
        data: createSingleTrackMidi(midiEvents, "808 Bass"),
        role: "bass",
        label: "808 Bass",
      });
    }
  }

  // 3. Peças de bateria individuais (Kick, Snare, Clap, Hi-Hat, Open-Hat)
  const drumEvents = timeline.events.filter((e) => e.role === "drums");
  const drumPieces: Array<{ instrument: "kick" | "snare" | "clap" | "hat" | "open-hat"; name: string; filename: string }> = [
    { instrument: "kick", name: "Drums - Kick", filename: "Drums_Kick.mid" },
    { instrument: "snare", name: "Drums - Snare", filename: "Drums_Snare.mid" },
    { instrument: "clap", name: "Drums - Clap", filename: "Drums_Clap.mid" },
    { instrument: "hat", name: "Drums - Hi-Hat", filename: "Drums_HiHat.mid" },
    { instrument: "open-hat", name: "Drums - Open-Hat", filename: "Drums_OpenHat.mid" },
  ];

  for (const piece of drumPieces) {
    const pieceEvents = drumEvents.filter((e) => e.instrument === piece.instrument);
    if (pieceEvents.length > 0) {
      const midiEvents = compileNoteEvents(pieceEvents, 9, arrangementEndTick);
      files.push({
        filename: piece.filename,
        data: createSingleTrackMidi(midiEvents, piece.name),
        role: "drums",
        label: piece.name,
      });
    }
  }

  return { files, timeline };
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
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const blob = new Blob([uint8 as unknown as BlobPart], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
