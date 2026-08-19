import test from "node:test";
import assert from "node:assert/strict";

import {
  CANONICAL_PPQ,
  DEFAULT_SECTION_DURATION_STEPS,
  MIDI_EXPORT_PPQ,
  TICKS_PER_STEP,
  buildCanonicalTimeline,
  canonicalTicksToMidiTicks,
  secondsToTicks,
  ticksToSamples,
  ticksToSeconds,
} from "../lib/music/canonical-timeline.ts";
import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer.ts";
import { createMidiExport } from "../lib/export/midi.ts";

function readUint32(bytes, offset) {
  return (
    bytes[offset] * 0x1000000 +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}

function readVarLength(bytes, state) {
  let value = 0;
  let byte;
  do {
    byte = bytes[state.offset++];
    value = (value << 7) | (byte & 0x7f);
  } while (byte & 0x80);
  return value;
}

function parseMidi(data) {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "MThd");

  const format = (bytes[8] << 8) | bytes[9];
  const trackCount = (bytes[10] << 8) | bytes[11];
  const ppq = (bytes[12] << 8) | bytes[13];
  const tracks = [];
  let offset = 14;

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    assert.equal(String.fromCharCode(...bytes.slice(offset, offset + 4)), "MTrk");
    const length = readUint32(bytes, offset + 4);
    const state = { offset: offset + 8 };
    const end = state.offset + length;
    const events = [];
    let tick = 0;
    let name = "";
    let endOfTrackTick = null;

    while (state.offset < end) {
      tick += readVarLength(bytes, state);
      const status = bytes[state.offset++];

      if (status === 0xff) {
        const type = bytes[state.offset++];
        const metaLength = readVarLength(bytes, state);
        const payload = bytes.slice(state.offset, state.offset + metaLength);
        state.offset += metaLength;
        if (type === 0x03 && !name) name = String.fromCharCode(...payload);
        if (type === 0x2f) endOfTrackTick = tick;
        continue;
      }

      const command = status & 0xf0;
      const dataLength = command === 0xc0 || command === 0xd0 ? 1 : 2;
      const first = bytes[state.offset++];
      const second = dataLength === 2 ? bytes[state.offset++] : 0;
      events.push({ tick, status, command, channel: status & 0x0f, first, second });
    }

    tracks.push({ name, events, endOfTrackTick });
    offset = end;
  }

  return { format, ppq, tracks };
}

function arrangementFixture() {
  const melodyResult = (notes) => ({
    engine: "melody",
    seed: 11,
    style: "trap-br",
    bpm: 120,
    key: "C",
    scale: "natural-minor",
    notes,
  });

  return {
    bpm: 120,
    melodyLayers: [
      {
        id: "lead",
        label: "Lead",
        synthType: "lead",
        style: "trap-br",
        key: "C",
        scale: "natural-minor",
        muted: false,
        result: melodyResult([{ step: 0, note: 60, velocity: 90, duration: 1 }]),
      },
    ],
    blocks: [
      {
        id: "intro",
        type: "intro",
        startStep: 0,
        durationSteps: 8,
        bass: {
          engine: "bass",
          seed: 21,
          style: "trap-br",
          bpm: 120,
          key: "C",
          notes: [
            { step: 0, note: 36, velocity: 100, duration: 5 },
            { step: 0, note: 36, velocity: 100, duration: 5 },
            { step: 4, note: 38, velocity: 96, duration: 4 },
            { step: 7, note: 40, velocity: 92, duration: 4, slide: true },
            { step: 8, note: 43, velocity: 90, duration: 1 },
          ],
        },
        drums: {
          engine: "drums",
          seed: 31,
          style: "trap-br",
          bpm: 120,
          hits: [
            { step: 0, drum: "kick", velocity: 110 },
            { step: 0, drum: "kick", velocity: 110 },
            { id: "clap-a", step: 2, drum: "clap", velocity: 90 },
            { id: "clap-b", step: 2, drum: "clap", velocity: 90 },
            {
              step: 7,
              drum: "hat",
              velocity: 84,
              roll: { count: 3, velocityCurve: "crescendo" },
            },
            { step: 8, drum: "snare", velocity: 100 },
          ],
        },
        melodyResults: [
          {
            layerId: "lead",
            result: melodyResult([
              { step: 7, note: 60, velocity: 100, duration: 4 },
              { step: 7, note: 60, velocity: 100, duration: 4 },
              { step: 8, note: 62, velocity: 90, duration: 1 },
            ]),
          },
        ],
      },
      {
        id: "drop",
        type: "drop",
        startStep: 12,
        durationSteps: 4,
        bass: {
          engine: "bass",
          seed: 22,
          style: "trap-br",
          bpm: 120,
          key: "C",
          notes: [],
        },
        drums: {
          engine: "drums",
          seed: 32,
          style: "trap-br",
          bpm: 120,
          hits: [{ step: 0, drum: "snare", velocity: 100 }],
        },
        melodyResults: [
          {
            layerId: "lead",
            result: melodyResult([{ step: 0, note: 67, velocity: 96, duration: 8 }]),
          },
        ],
      },
    ],
  };
}

test("canonical timeline centralizes PPQ and lossless unit conversions", () => {
  assert.equal(CANONICAL_PPQ, 960);
  assert.equal(MIDI_EXPORT_PPQ, 480);
  assert.equal(DEFAULT_SECTION_DURATION_STEPS, 16);
  assert.equal(TICKS_PER_STEP, 240);
  assert.equal(canonicalTicksToMidiTicks(960), 480);
  assert.equal(secondsToTicks(ticksToSeconds(7_680, 123), 123), 7_680);
  assert.equal(ticksToSamples(960, 120, 48_000), 24_000);
});

test("canonical timeline normalizes sections, bounds, duplicates, rolls, and bass overlap", () => {
  const input = arrangementFixture();
  const timeline = buildCanonicalTimeline(input);
  const repeated = buildCanonicalTimeline(structuredClone(input));

  assert.equal(timeline.arrangementEndTick, 16 * TICKS_PER_STEP);
  assert.equal(timeline.timelineHash, repeated.timelineHash);
  assert.deepEqual(
    timeline.blocks.map(({ id, startStep, durationSteps }) => ({ id, startStep, durationSteps })),
    [
      { id: "intro", startStep: 0, durationSteps: 8 },
      { id: "drop", startStep: 12, durationSteps: 4 },
    ]
  );
  assert.ok(
    timeline.events.every(
      (event) =>
        event.startTick >= event.sectionStartTick &&
        event.startTick < event.sectionEndTick &&
        event.endTick <= event.sectionEndTick &&
        event.endTick <= timeline.arrangementEndTick
    )
  );

  const lead = timeline.events.filter((event) => event.trackId === "lead");
  assert.equal(lead.length, 2, "one exact duplicate and two out-of-section notes are removed");
  assert.equal(lead[0].endTick, 8 * TICKS_PER_STEP, "intro note is clipped at section end");
  assert.equal(lead[1].endTick, 16 * TICKS_PER_STEP, "drop note is clipped at arrangement end");

  const kicks = timeline.events.filter((event) => event.instrument === "kick");
  assert.equal(kicks.length, 1, "unidentified exact duplicate attack is removed");
  const claps = timeline.events.filter((event) => event.instrument === "clap");
  assert.equal(claps.length, 2, "explicitly identified stacked attacks remain intentional");
  const roll = timeline.events.filter((event) => event.instrument === "hat");
  assert.deepEqual(roll.map((event) => event.subIndex), [0, 1, 2]);

  const bass = timeline.events.filter((event) => event.role === "bass");
  assert.equal(bass.length, 3, "duplicate and out-of-section bass notes are removed");
  assert.equal(bass[0].endTick, bass[1].startTick, "ordinary bass voices do not overlap");
  assert.ok(bass[1].endTick > bass[2].startTick, "a marked glide keeps a short overlap");
  assert.ok(
    bass[1].endTick - bass[2].startTick <= TICKS_PER_STEP / 4,
    "glide overlap remains shorter than a quarter step"
  );
});

test("implicit block positions are cumulative and missing duration defaults to 16 steps", () => {
  const input = arrangementFixture();
  delete input.blocks[0].startStep;
  delete input.blocks[1].startStep;
  delete input.blocks[1].durationSteps;
  const timeline = buildCanonicalTimeline(input);

  assert.equal(timeline.blocks[0].startStep, 0);
  assert.equal(timeline.blocks[1].startStep, 8);
  assert.equal(timeline.blocks[1].durationSteps, 16);
  assert.equal(timeline.arrangementEndTick, 24 * TICKS_PER_STEP);
});

test("MIDI uses intentional 480 PPQ conversion and aligns every EOT to arrangement end", () => {
  const input = arrangementFixture();
  const exported = createMidiExport(input);
  const parsed = parseMidi(exported.data);
  const expectedEnd = canonicalTicksToMidiTicks(exported.timeline.arrangementEndTick);

  assert.equal(parsed.format, 1);
  assert.equal(parsed.ppq, MIDI_EXPORT_PPQ);
  assert.ok(parsed.tracks.length >= 4);
  assert.ok(parsed.tracks.every((track) => track.endOfTrackTick === expectedEnd));
  assert.ok(
    parsed.tracks.flatMap((track) => track.events).every((event) => event.tick <= expectedEnd),
    "no MIDI event crosses arrangementEndTick"
  );

  const drums = parsed.tracks.find((track) => track.name === "Drums");
  assert.ok(drums);
  const noteOns = drums.events.filter((event) => event.command === 0x90 && event.second > 0);
  assert.equal(noteOns.filter((event) => event.first === 36).length, 1);
  assert.equal(noteOns.filter((event) => event.first === 39).length, 2);
  assert.equal(noteOns.filter((event) => event.first === 42).length, 3);

  const bass = parsed.tracks.find((track) => track.name === "808 Bass");
  assert.ok(bass);
  assert.equal(
    bass.events.filter((event) => event.command === 0x90 && event.second > 0).length,
    3
  );
});

test("WAV defaults to one canonical pass and extends duration only with an explicit tail", () => {
  const input = arrangementFixture();
  const midi = createMidiExport(input);
  const dry = renderDspAudio({ ...input, sampleRate: 8_000 });
  const withTail = renderDspAudio({ ...input, sampleRate: 8_000, tailSeconds: 0.25 });
  const expectedDrySamples = ticksToSamples(
    midi.timeline.arrangementEndTick,
    midi.timeline.bpm,
    8_000,
    "ceil"
  );

  assert.equal(dry.timelineHash, midi.timeline.timelineHash);
  assert.equal(dry.left.length, expectedDrySamples);
  assert.equal(dry.right.length, expectedDrySamples);
  assert.equal(withTail.left.length, expectedDrySamples + 2_000);

  const wav = encodeWav16Bit(dry.left, dry.right, dry.sampleRate);
  const wavView = new DataView(wav);
  const sampleRate = wavView.getUint32(24, true);
  const blockAlign = wavView.getUint16(32, true);
  const frameCount = wavView.getUint32(40, true) / blockAlign;
  assert.equal(sampleRate, 8_000);
  assert.equal(frameCount, expectedDrySamples);
  assert.equal(frameCount / sampleRate, midi.timeline.durationSeconds);
});
