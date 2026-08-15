import type { BassResult, DrumResult, MelodyLayer } from "../music/types";

// Helper to write Variable-Length Quantities in MIDI
function writeVarLength(value: number): number[] {
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

// Helper to convert 16-bit / 32-bit numbers to big-endian bytes
function numToBytes(num: number, byteCount: number): number[] {
  const bytes: number[] = [];
  for (let i = byteCount - 1; i >= 0; i--) {
    bytes.push((num >> (i * 8)) & 0xff);
  }
  return bytes;
}

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
  bass,
  drums,
}: {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  bass?: BassResult | null;
  drums?: DrumResult | null;
}): Uint8Array {
  const TICKS_PER_BEAT = 480;
  const TICKS_PER_STEP = 120; // 16th note

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

  // --- Melody Layers (each gets its own track, channels 0-3) ---
  const activeLayers = (melodyLayers ?? []).filter(
    (layer) => !layer.muted && layer.result && layer.result.notes.length > 0
  );

  activeLayers.forEach((layer, idx) => {
    const channel = Math.min(idx, 3); // MIDI channels 0-3 for melody layers
    const noteOn = 0x90 | channel;
    const noteOff = 0x80 | channel;
    const events: MidiEvent[] = [];

    layer.result!.notes.forEach((note) => {
      const startTick = note.step * TICKS_PER_STEP;
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

    const trackLabel = `Melody ${layer.label} (${layer.synthType})`;
    tracks.push(buildTrackChunk(events, trackLabel));
  });

  // --- Track 2: 808 Bass (Channel 1) ---
  if (bass && bass.notes.length > 0) {
    const bassEvents: MidiEvent[] = [];
    bass.notes.forEach((note) => {
      const startTick = note.step * TICKS_PER_STEP;
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
    tracks.push(buildTrackChunk(bassEvents, "808 Bass"));
  }

  // --- Track 3: Drums (Channel 9 / 10 in standard 1-index) ---
  if (drums && drums.hits.length > 0) {
    const drumEvents: MidiEvent[] = [];
    const GM_MAP: Record<string, number> = {
      kick: 36, // Bass Drum 1
      snare: 38, // Acoustic Snare
      hat: 42, // Closed Hi-Hat
      "open-hat": 46, // Open Hi-Hat
    };

    drums.hits.forEach((hit) => {
      const midiPitch = GM_MAP[hit.drum] || 36;
      const startTick = hit.step * TICKS_PER_STEP;
      const durationTicks = 60; // 32nd note trigger

      // Note On: 99 [pitch] [velocity]
      drumEvents.push({
        tick: startTick,
        data: [0x99, midiPitch, Math.min(127, Math.max(1, hit.velocity))],
      });
      // Note Off: 89 [pitch] 00
      drumEvents.push({
        tick: startTick + durationTicks,
        data: [0x89, midiPitch, 0],
      });
    });
    tracks.push(buildTrackChunk(drumEvents, "Trap Drums"));
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
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
  const blob = new Blob([uint8 as unknown as BlobPart], { type: "audio/midi" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
