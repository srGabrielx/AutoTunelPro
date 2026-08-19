import assert from "node:assert/strict";
import test from "node:test";

import { generateFullComposition } from "../lib/music/full-composition.ts";

const payload = {
  bpm: 120,
  key: "C",
  globalScale: "natural-minor",
  complexity: 3,
  bassStyle: "trap-br",
  bassOctave: -24,
  drumStyle: "trap-br",
  drumPattern: "standard",
  melodyLayers: [{
    id: "lead",
    label: "Lead",
    synthType: "lead",
    style: "trap-br",
    key: "C",
    scale: "natural-minor",
    muted: false,
  }],
  seed: 91,
  variationIndex: 2,
  candidateCount: 2,
};

function timelineLayers() {
  return payload.melodyLayers.map((layer) => ({ ...layer, result: null }));
}

test("export worker returns the canonical snapshot hash for MIDI and WAV", async () => {
  const responses = [];
  globalThis.self = {
    onmessage: null,
    postMessage(message) {
      responses.push(message);
    },
  };

  await import(`../workers/export.worker.ts?metadata=${process.pid}`);
  const composition = generateFullComposition(payload);
  const common = {
    bpm: payload.bpm,
    melodyLayers: timelineLayers(),
    blocks: composition.blocks,
    muteBass: false,
    muteDrums: false,
  };

  globalThis.self.onmessage({
    data: {
      type: "export-midi",
      requestId: "midi-1",
      payload: common,
    },
  });
  globalThis.self.onmessage({
    data: {
      type: "export-wav",
      requestId: "wav-1",
      payload: { ...common, loops: 1, tailSeconds: 0 },
    },
  });

  const midi = responses.find((response) => response.requestId === "midi-1");
  const wav = responses.find((response) => response.requestId === "wav-1");
  assert.equal(midi.success, true);
  assert.equal(wav.success, true);
  assert.equal(midi.data.timelineHash, composition.timeline.hash);
  assert.equal(wav.data.timelineHash, composition.timeline.hash);
  assert.equal(midi.data.arrangementEndTick, composition.timeline.arrangementEndTick);
  assert.equal(wav.data.arrangementEndTick, composition.timeline.arrangementEndTick);
  assert.ok(midi.data.byteLength > 100);
  assert.ok(wav.data.byteLength > 44);
});
