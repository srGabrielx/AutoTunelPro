import assert from "node:assert/strict";
import test from "node:test";

import {
  COMPOSITION_SNAPSHOT_VERSION,
  createCompositionContentId,
  createCompositionSnapshotHash,
  deserializeCompositionSnapshot,
  serializeCompositionSnapshot,
} from "../lib/music/composition-snapshot.ts";

function fixture() {
  return {
    snapshotVersion: COMPOSITION_SNAPSHOT_VERSION,
    compositionId: "composition-session-a",
    seed: 1234,
    seedLocked: true,
    variationIndex: 7,
    identity: {
      generationId: "composition-deadbeef",
      masterSeed: "1234",
      variationIndex: 7,
      attempt: 1,
      candidateCount: 3,
      schemaVersion: 1,
      engineVersion: "forensic-1",
      presetVersion: 1,
      genreId: "trap-br",
      styleId: "trap-br",
      presetId: "trap-br",
      parametersHash: "parameters-a",
      planHash: "plan-a",
      score: 0.8,
    },
    timeline: {
      ppq: 960,
      totalSteps: 48,
      endTick: 11520,
      arrangementEndTick: 11520,
      hash: "timeline-a",
    },
    controls: {
      artistPreset: "1-matue-kennyg",
      bpm: 124,
      key: "G#",
      globalScale: "natural-minor",
      complexity: 4,
      bassStyle: "trap-br",
      bassOctave: -24,
      bassDrive: "warm",
      drumStyle: "trap-br",
      drumPattern: "standard",
      drumKit: "trap-808",
      swing: 30,
      rollDensity: 65,
      humanize: 50,
      muteBass: false,
      muteDrums: false,
      isLooping: true,
    },
    melodyLayers: [{
      id: "lead",
      label: "Lead",
      synthType: "lead",
      style: "trap-br",
      key: "G#",
      scale: "natural-minor",
      muted: false,
      result: null,
    }],
    trackSettings: {},
    blocks: [{
      id: "intro-0",
      type: "intro",
      startStep: 0,
      durationSteps: 16,
      energy: 0.35,
      attempt: 1,
      bass: {
        engine: "bass",
        seed: 11,
        style: "trap-br",
        bpm: 124,
        key: "G#",
        scale: "natural-minor",
        notes: [{ step: 0, note: 32, velocity: 100, duration: 2 }],
      },
      drums: {
        engine: "drums",
        seed: 12,
        style: "trap-br",
        bpm: 124,
        hits: [{ step: 0, drum: "kick", velocity: 100 }],
      },
      melodyResults: [],
    }],
    currentBlockId: "intro-0",
  };
}

test("snapshot round-trip preserves events, identity and hashes", () => {
  const before = fixture();
  const serialized = serializeCompositionSnapshot(before);
  const restored = deserializeCompositionSnapshot(serialized);

  assert.deepEqual(restored, before);
  assert.equal(createCompositionSnapshotHash(restored), createCompositionSnapshotHash(before));
  assert.equal(restored.timeline.hash, before.timeline.hash);
  assert.deepEqual(restored.blocks[0].bass.notes, before.blocks[0].bass.notes);
  assert.equal(createCompositionContentId(restored), createCompositionContentId(before));
});

test("content CID changes after an event edit but ignores its own stored value", () => {
  const before = fixture();
  const sameContent = { ...before, compositionId: "composition-another-label" };
  const edited = structuredClone(before);
  edited.blocks[0].bass.notes[0].note += 1;

  assert.equal(createCompositionContentId(before), createCompositionContentId(sameContent));
  assert.notEqual(createCompositionContentId(before), createCompositionContentId(edited));
});

test("snapshot parser rejects modified persisted musical state", () => {
  const serialized = serializeCompositionSnapshot(fixture());
  const envelope = JSON.parse(serialized);
  envelope.snapshot.blocks[0].bass.notes[0].note = 99;

  assert.equal(deserializeCompositionSnapshot(JSON.stringify(envelope)), null);
});
