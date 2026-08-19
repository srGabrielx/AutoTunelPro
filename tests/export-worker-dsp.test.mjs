import test from "node:test";
import assert from "node:assert/strict";
import { createMidiFile } from "../lib/export/midi.ts";
import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer.ts";
import { generateDrums } from "../lib/engines/drums.ts";
import { buildGrooveEventPlan } from "../lib/music/groove-plan.ts";

test("MIDI Export - Valid Header and Chunk Format", () => {
  const midi = createMidiFile({
    bpm: 140,
    melodyLayers: [
      {
        id: "l1",
        label: "Lead",
        synthType: "lead",
        style: "trap-br",
        key: "C",
        scale: "natural-minor",
        muted: false,
        result: {
          style: "trap-br",
          bpm: 140,
          key: "C",
          scale: "natural-minor",
          notes: [
            { step: 0, note: 60, velocity: 100, duration: 2 },
            { step: 4, note: 63, velocity: 90, duration: 1 },
          ],
          seed: "test-seed",
        },
      },
    ],
    bass: {
      style: "trap-br",
      bpm: 140,
      key: "C",
      notes: [{ step: 0, note: 36, velocity: 110, duration: 4, slide: false }],
      seed: "bass-seed",
    },
    drums: {
      style: "trap-br",
      bpm: 140,
      hits: [
        { step: 0, drum: "kick", velocity: 100 },
        { step: 4, drum: "snare", velocity: 95 },
      ],
      seed: "drum-seed",
    },
  });

  assert.ok(midi instanceof Uint8Array, "MIDI output must be Uint8Array");
  assert.ok(midi.length > 44, "MIDI file must have sufficient length");

  // Check 'MThd' header
  const header = String.fromCharCode(midi[0], midi[1], midi[2], midi[3]);
  assert.equal(header, "MThd", "Header magic string must be MThd");

  // Format 1 (multi-track)
  const format = (midi[8] << 8) | midi[9];
  assert.equal(format, 1, "MIDI format must be Format 1");

  // Check that at least one MTrk exists
  let hasMTrk = false;
  for (let i = 0; i < midi.length - 4; i++) {
    if (
      midi[i] === 0x4d &&
      midi[i + 1] === 0x54 &&
      midi[i + 2] === 0x72 &&
      midi[i + 3] === 0x6b
    ) {
      hasMTrk = true;
      break;
    }
  }
  assert.ok(hasMTrk, "MIDI file must contain MTrk chunks");
});

test("WAV Export - Valid RIFF and WAVE Headers & PCM Structure", () => {
  const { left, right, sampleRate } = renderDspAudio({
    bpm: 140,
    melodyLayers: [],
    blocks: [{
      type: "verse",
      bass: {
        style: "trap-br",
        bpm: 140,
        key: "C",
        notes: [{ step: 0, note: 36, velocity: 100, duration: 2 }],
        seed: "test",
      },
      drums: {
        style: "trap-br",
        bpm: 140,
        hits: [{ step: 0, drum: "kick", velocity: 90 }],
        seed: "test",
      },
      melodyResults: [],
    }],
    loops: 1,
    sampleRate: 44100,
  });

  assert.equal(sampleRate, 44100);
  assert.ok(left.length > 0 && right.length === left.length);

  const wavBuffer = encodeWav16Bit(left, right, sampleRate);
  assert.ok(wavBuffer instanceof ArrayBuffer, "WAV buffer must be ArrayBuffer");

  const view = new DataView(wavBuffer);

  // Check 'RIFF'
  const riff = String.fromCharCode(
    view.getUint8(0),
    view.getUint8(1),
    view.getUint8(2),
    view.getUint8(3)
  );
  assert.equal(riff, "RIFF");

  // Check 'WAVE'
  const wave = String.fromCharCode(
    view.getUint8(8),
    view.getUint8(9),
    view.getUint8(10),
    view.getUint8(11)
  );
  assert.equal(wave, "WAVE");

  // Check 'fmt '
  const fmt = String.fromCharCode(
    view.getUint8(12),
    view.getUint8(13),
    view.getUint8(14),
    view.getUint8(15)
  );
  assert.equal(fmt, "fmt ");

  // Channels = 2 (stereo)
  const numChannels = view.getUint16(22, true);
  assert.equal(numChannels, 2);

  // Sample Rate = 44100
  const sRate = view.getUint32(24, true);
  assert.equal(sRate, 44100);

  // Bit Depth = 16
  const bitDepth = view.getUint16(34, true);
  assert.equal(bitDepth, 16);

  // Check 'data' chunk
  const dataTag = String.fromCharCode(
    view.getUint8(36),
    view.getUint8(37),
    view.getUint8(38),
    view.getUint8(39)
  );
  assert.equal(dataTag, "data");

  // Verify byte length consistency
  const dataLength = view.getUint32(40, true);
  const expectedDataLength = left.length * 2 * (16 / 8);
  assert.equal(dataLength, expectedDataLength);
  assert.equal(wavBuffer.byteLength, 44 + dataLength);
});

test("DSP Synthesis - Deterministic Sound Generation", () => {
  const opts = {
    bpm: 130,
    melodyLayers: [
      {
        id: "l1",
        label: "Pluck",
        synthType: "pluck",
        style: "trap-uk",
        key: "D",
        scale: "harmonic-minor",
        muted: false,
        result: {
          style: "trap-uk",
          bpm: 130,
          key: "D",
          scale: "harmonic-minor",
          notes: [{ step: 0, note: 62, velocity: 85, duration: 1 }],
          seed: "fixed-seed",
        }
      }
    ],
    blocks: [{
      type: "verse",
      bass: { style: "trap-br", bpm: 130, key: "C", notes: [], seed: "b" },
      drums: { style: "trap-br", bpm: 130, hits: [], seed: "d" },
      melodyResults: [{
        layerId: "l1",
        result: {
          style: "trap-uk",
          bpm: 130,
          key: "D",
          scale: "harmonic-minor",
          notes: [{ step: 0, note: 62, velocity: 85, duration: 1 }],
          seed: "fixed-seed",
        }
      }]
    }],
    loops: 1,
    sampleRate: 44100,
  };

  const render1 = renderDspAudio(opts);
  const render2 = renderDspAudio(opts);

  assert.equal(render1.left.length, render2.left.length);
  for (let i = 0; i < 500; i++) {
    assert.equal(render1.left[i], render2.left[i], `Sample mismatch at ${i}`);
  }
});

// ============================================================
// MIDI PARITY REGRESSION TESTS (Lote 1)
// ============================================================

test("MIDI Export - Rolls Expanded Into Individual MIDI Notes", () => {
  const bpm = 140;
  const drums = {
    engine: "drums",
    seed: 12345,
    style: "trap-br",
    bpm,
    hits: [
      { step: 6, drum: "hat", velocity: 80, roll: { count: 3, velocityCurve: "crescendo" } },
      { step: 0, drum: "kick", velocity: 100 },
    ],
  };

  const midi = createMidiFile({ bpm, blocks: [{ type: "intro", bass: { notes: [] }, drums, melodyResults: [] }] });
  assert.ok(midi instanceof Uint8Array);

  // The groove plan should expand the roll count:3 into 3 sub-events
  const plan = buildGrooveEventPlan({ hits: drums.hits, bpm, patternDurationSteps: 16 });
  const hatEvents = plan.filter((ev) => ev.instrument === "hat");
  assert.equal(hatEvents.length, 3, "Roll with count:3 must produce 3 groove events");

  // Count Note On events (0x99) in the MIDI data for hat pitch (42)
  let hatNoteOns = 0;
  for (let i = 0; i < midi.length - 2; i++) {
    if (midi[i] === 0x99 && midi[i + 1] === 42) {
      hatNoteOns++;
    }
  }
  assert.equal(hatNoteOns, 3, "MIDI must contain 3 hat Note On events for a roll with count:3");
});

test("MIDI Export - Clap Events Use GM Hand Clap Pitch 39", () => {
  const bpm = 140;
  const drums = {
    engine: "drums",
    seed: 99999,
    style: "trap-br",
    bpm,
    hits: [
      { step: 4, drum: "clap", velocity: 92 },
      { step: 12, drum: "clap", velocity: 88 },
    ],
  };

  const midi = createMidiFile({ bpm, blocks: [{ type: "intro", bass: { notes: [] }, drums, melodyResults: [] }] });

  // Count Note On events (0x99) for clap pitch (39)
  let clapNoteOns = 0;
  for (let i = 0; i < midi.length - 2; i++) {
    if (midi[i] === 0x99 && midi[i + 1] === 39) {
      clapNoteOns++;
    }
  }
  assert.equal(clapNoteOns, 2, "MIDI must contain 2 clap Note On events with GM pitch 39");
});

test("MIDI Export - Event Count Matches Groove Plan", () => {
  const bpm = 140;
  const drums = generateDrums({ style: "trap-uk", bpm, seed: 554433, complexity: 4 });
  const plan = buildGrooveEventPlan({ hits: drums.hits, bpm, patternDurationSteps: 16 });

  const midi = createMidiFile({ bpm, blocks: [{ type: "intro", bass: { notes: [] }, drums, melodyResults: [] }] });

  // Count total Note On events (0x99) in MIDI
  let midiNoteOns = 0;
  for (let i = 0; i < midi.length - 1; i++) {
    if (midi[i] === 0x99) {
      midiNoteOns++;
    }
  }

  assert.equal(
    midiNoteOns,
    plan.length,
    `MIDI Note On count (${midiNoteOns}) must equal groove plan event count (${plan.length})`
  );
});

test("MIDI Export - Generated Drums Still Produce Valid MIDI", () => {
  const bpm = 140;
  const drums = generateDrums({ style: "trap-br", bpm, seed: 778899, complexity: 5 });

  const midi = createMidiFile({ bpm, blocks: [{ type: "intro", bass: { notes: [] }, drums, melodyResults: [] }] });
  assert.ok(midi instanceof Uint8Array);
  assert.ok(midi.length > 44, "MIDI file must have sufficient length");

  // Verify MThd header
  const header = String.fromCharCode(midi[0], midi[1], midi[2], midi[3]);
  assert.equal(header, "MThd");
});
