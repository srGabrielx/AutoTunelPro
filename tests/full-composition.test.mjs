import test from "node:test";
import assert from "node:assert/strict";

import { generateMelody } from "../lib/engines/melody.ts";
import { buildCanonicalTimeline } from "../lib/music/canonical-timeline.ts";
import { generateFullComposition } from "../lib/music/full-composition.ts";
import { rng } from "../lib/music/random.ts";

const payload = {
  bpm: 124,
  key: "G#",
  globalScale: "natural-minor",
  complexity: 4,
  bassStyle: "trap-br",
  bassOctave: -24,
  drumStyle: "trap-br",
  drumPattern: "standard",
  swing: 30,
  rollDensity: 65,
  humanize: 50,
  melodyLayers: [
    {
      id: "lead-1",
      label: "Lead principal",
      synthType: "pluck",
      style: "trap-br",
      key: "G#",
      scale: "natural-minor",
      muted: false,
    },
  ],
  seed: 7,
  variationIndex: 2,
  candidateCount: 3,
};

function musicalFingerprint(result) {
  return result.blocks.map((block) => ({
    type: block.type,
    bass: block.bass.notes.map(({ step, note, duration, slide }) => ({
      step,
      note,
      duration,
      slide: Boolean(slide),
    })),
    drums: block.drums.hits.map(({ step, drum, roll }) => ({
      step,
      drum,
      rollCount: roll?.count ?? 1,
    })),
    melodies: block.melodyResults.map(({ layerId, result: melody }) => ({
      layerId,
      notes: melody.notes.map(({ step, note, duration }) => ({ step, note, duration })),
    })),
  }));
}

function timelineLayers(source) {
  return source.melodyLayers.map((layer) => ({
    ...layer,
    label: layer.label || layer.id,
    synthType: layer.synthType || "lead",
    result: null,
  }));
}

test("full composition is byte-stable for a complete identity", () => {
  const first = generateFullComposition(payload);
  const repeated = generateFullComposition(structuredClone(payload));

  assert.deepEqual(repeated, first);
  assert.equal(first.identity.masterSeed, "7");
  assert.equal(first.identity.variationIndex, 2);
  assert.equal(first.identity.candidateCount, 3);
  if (!(first.identity.attempt >= 0 && first.identity.attempt < 3)) {
    console.log("FAILED ATTEMPT CHECK! first.identity = ", first.identity);
  }
  assert.ok(first.identity.attempt >= 0 && first.identity.attempt < 3);
  assert.match(first.identity.parametersHash, /^[0-9a-f]{16}$/);
  assert.match(first.identity.planHash, /^[0-9a-f]{16}$/);
});

test("variationIndex changes musical events without changing the parameter hash", () => {
  const first = generateFullComposition({ ...payload, variationIndex: 0 });
  const variation = generateFullComposition({ ...payload, variationIndex: 1 });

  assert.notDeepEqual(musicalFingerprint(variation), musicalFingerprint(first));
  assert.equal(variation.identity.parametersHash, first.identity.parametersHash);
  assert.notEqual(variation.timeline.hash, first.timeline.hash);
});

test("intro, verse and drop are explicit bounded sections with rising energy", () => {
  const composition = generateFullComposition(payload);

  assert.deepEqual(composition.blocks.map((block) => block.type), ["intro", "verse", "drop"]);
  assert.deepEqual(composition.blocks.map((block) => block.startStep), [0, 16, 32]);
  assert.ok(composition.blocks.every((block) => block.durationSteps === 16));
  assert.ok(composition.blocks.every((block) => block.attempt === composition.identity.attempt));
  assert.ok(composition.blocks[0].energy < composition.blocks[1].energy);
  assert.ok(composition.blocks[1].energy < composition.blocks[2].energy);

  const densities = composition.blocks.map((block) =>
    block.bass.notes.length
      + block.drums.hits.length
      + block.melodyResults.reduce((sum, layer) => sum + layer.result.notes.length, 0)
  );
  assert.ok(densities[0] < densities[1]);
  assert.ok(densities[1] < densities[2]);

  for (const block of composition.blocks) {
    assert.ok(block.bass.notes.every((note) =>
      note.step >= 0 && note.step + note.duration <= block.durationSteps
    ));
    assert.ok(block.drums.hits.every((hit) => hit.step >= 0 && hit.step < block.durationSteps));
    assert.ok(block.melodyResults.every(({ result }) => result.notes.every((note) =>
      note.step >= 0 && note.step + note.duration <= block.durationSteps
    )));
  }
});

test("bass onsets are derived from real kick attacks and shared harmony", () => {
  const composition = generateFullComposition(payload);
  let aligned = 0;
  let responses = 0;

  for (const block of composition.blocks) {
    const kicks = new Set(
      block.drums.hits.filter((hit) => hit.drum === "kick").map((hit) => hit.step),
    );
    for (const note of block.bass.notes) {
      const isAligned = kicks.has(note.step);
      const isResponse = kicks.has(note.step - 1);
      assert.ok(isAligned || isResponse, `bass step ${note.step} is unrelated to generated kicks`);
      if (isAligned) aligned++;
      if (isResponse) responses++;
      // G# natural minor pitch classes; bass is always rooted in a shared
      // harmonic region rather than inventing a chromatic progression.
      assert.ok(new Set([8, 10, 11, 1, 3, 4, 6]).has(((note.note % 12) + 12) % 12));
    }
  }

  assert.ok(aligned > 0);
  assert.ok(responses > 0);
});

test("response timeline metadata is the canonical player/export timeline", () => {
  const composition = generateFullComposition(payload);
  const rebuilt = buildCanonicalTimeline({
    bpm: payload.bpm,
    blocks: composition.blocks,
    melodyLayers: timelineLayers(payload),
  });

  assert.equal(composition.timeline.ppq, 960);
  assert.equal(composition.timeline.totalSteps, 48);
  assert.equal(composition.timeline.endTick, 11_520);
  assert.equal(composition.timeline.arrangementEndTick, rebuilt.arrangementEndTick);
  assert.equal(composition.timeline.hash, rebuilt.timelineHash);
});

test("generated drum rolls never create doubled attacks at the same tick", () => {
  const composition = generateFullComposition({
    ...payload,
    seed: 123,
    variationIndex: 0,
  });
  const timeline = buildCanonicalTimeline({
    bpm: payload.bpm,
    blocks: composition.blocks,
    melodyLayers: timelineLayers(payload),
  });
  const attacks = timeline.events
    .filter((event) => event.role === "drums")
    .map((event) => `${event.trackId}:${event.startTick}:${event.pitch}`);

  assert.equal(new Set(attacks).size, attacks.length);
});

test("zero seed is distinct and the former hip-hop seed 8 loop terminates", () => {
  const zero = rng(0);
  const one = rng(1);
  assert.notDeepEqual(
    Array.from({ length: 8 }, () => zero()),
    Array.from({ length: 8 }, () => one()),
  );

  const melody = generateMelody({
    style: "hip-hop",
    bpm: 90,
    key: "C",
    scale: "natural-minor",
    complexity: 3,
    seed: 8,
  });
  assert.ok(melody.notes.length >= 2);
});

test("studio worker preserves manual seeds and composes full snapshots without API fan-out", async (t) => {
  const previousSelf = globalThis.self;
  const previousFetch = globalThis.fetch;
  const posted = [];
  const requests = [];
  globalThis.self = {
    onmessage: null,
    postMessage(message) {
      posted.push(message);
    },
  };
  globalThis.fetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    return {
      ok: true,
      status: 200,
      async json() {
        return {
          engine: "melody",
          seed: requests.at(-1).body.seed,
          style: "trap-br",
          bpm: 124,
          key: "G#",
          scale: "natural-minor",
          notes: [],
        };
      },
    };
  };
  t.after(() => {
    globalThis.self = previousSelf;
    globalThis.fetch = previousFetch;
  });

  await import("../workers/studio.worker.ts?full-composition-regression");
  const dispatch = globalThis.self.onmessage;
  const melodyPayload = {
    layerId: "lead-1",
    style: "trap-br",
    bpm: 124,
    key: "G#",
    scale: "natural-minor",
    complexity: 4,
  };
  await dispatch({
    data: {
      type: "generate-melody",
      requestId: "manual-seed",
      payload: { ...melodyPayload, seed: 42 },
    },
  });
  await dispatch({
    data: { type: "generate-melody", requestId: "auto-seed-1", payload: melodyPayload },
  });
  await dispatch({
    data: { type: "generate-melody", requestId: "auto-seed-2", payload: melodyPayload },
  });

  assert.equal(requests[0].body.seed, 42);
  assert.notEqual(requests[1].body.seed, requests[2].body.seed);

  const requestCountBeforeFull = requests.length;
  await dispatch({
    data: { type: "generate-all", requestId: "full-direct", payload },
  });
  assert.equal(requests.length, requestCountBeforeFull, "generate-all must not fetch nine APIs");
  const fullResponse = posted.find((message) => message.requestId === "full-direct");
  assert.equal(fullResponse.success, true);
  assert.equal(fullResponse.data.timeline.ppq, 960);
});

test("all approved style profiles produce 32 valid non-constant seed variations", () => {
  const styles = [
    "trap-br",
    "trap-uk",
    "trap-usa",
    "hip-hop",
    "funk",
    "amapiano",
    "reggae-default",
    "boombap-default",
    "hiphop-default",
    "dubstep-default",
  ];
  const representativeFingerprints = new Set();

  for (const style of styles) {
    const fingerprints = new Set();
    for (let seed = 0; seed < 32; seed++) {
      const composition = generateFullComposition({
        ...payload,
        seed,
        variationIndex: 0,
        candidateCount: 1,
        bassStyle: style,
        drumStyle: style,
        melodyLayers: payload.melodyLayers.map((layer) => ({ ...layer, style })),
      });
      const fingerprint = JSON.stringify(musicalFingerprint(composition));
      fingerprints.add(fingerprint);
      assert.ok(composition.blocks.every((block) =>
        block.drums.hits.length > 0
          && block.bass.notes.length > 0
          && block.melodyResults.every(({ result }) => result.notes.length > 0)
      ));
      if (seed === 7) representativeFingerprints.add(fingerprint);
    }
    assert.equal(fingerprints.size, 32, `${style} collapsed different seeds`);
  }

  assert.equal(
    representativeFingerprints.size,
    styles.length,
    "representative genre profiles collapsed to the same musical language",
  );
});
