import test from "node:test";
import assert from "node:assert/strict";

import { SampleAccurateAudioEngine } from "../lib/music/audio-transport.ts";
import { buildCanonicalTimeline } from "../lib/music/canonical-timeline.ts";

const melodyResult = (seed, note, extra = []) => ({
  engine: "melody",
  seed,
  style: "trap-br",
  bpm: 124,
  key: "C",
  scale: "natural-minor",
  notes: [{ step: 0, note, velocity: 90, duration: 2 }, ...extra],
});

const block = (id, type, startStep, note) => ({
  id,
  type,
  startStep,
  durationSteps: 16,
  energy: type === "intro" ? 0.35 : type === "drop" ? 1 : 0.65,
  attempt: 0,
  melodyResults: [{ layerId: "lead", result: melodyResult(startStep, note) }],
  bass: {
    engine: "bass",
    seed: startStep,
    style: "trap-br",
    bpm: 124,
    key: "C",
    notes: [{ step: 0, note: note - 24, velocity: 105, duration: 4 }],
  },
  drums: {
    engine: "drums",
    seed: startStep,
    style: "trap-br",
    bpm: 124,
    hits: [{ step: 0, drum: "kick", velocity: 110 }],
  },
});

const layer = {
  id: "lead",
  label: "Lead",
  synthType: "lead",
  style: "trap-br",
  key: "C",
  scale: "natural-minor",
  muted: false,
  result: melodyResult(0, 60),
};

function prepare(blocks) {
  const engine = new SampleAccurateAudioEngine();
  engine.prepareStepEvents({
    bpm: 124,
    melodyLayers: [layer],
    bass: blocks[0].bass,
    drums: blocks[0].drums,
    muteBass: false,
    muteDrums: false,
    bassDrive: "warm",
    drumKit: "trap-808",
    blocks,
  });
  return engine.getPreparedTimelineSummary();
}

test("audio transport indexes the complete Intro/Verse/Drop arrangement", () => {
  const blocks = [
    block("intro-a", "intro", 0, 60),
    block("verse-a", "verse", 16, 63),
    block("drop-a", "drop", 32, 67),
  ];
  const summary = prepare(blocks);

  assert.equal(summary.totalSteps, 48);
  assert.equal(summary.arrangementEndTick, 48 * 240);
  assert.equal(summary.melodyEvents, 3);
  assert.equal(summary.bassEvents, 3);
  assert.equal(summary.drumEvents, 3);
  assert.equal(
    summary.timelineHash,
    buildCanonicalTimeline({ bpm: 124, melodyLayers: [layer], blocks }).timelineHash,
  );
});

test("audio transport clamps section-local events and hashes musical content", () => {
  const clean = [block("intro-a", "intro", 0, 60)];
  const leaking = structuredClone(clean);
  leaking[0].melodyResults[0].result.notes.push({
    step: 99,
    note: 84,
    velocity: 127,
    duration: 8,
  });

  const cleanSummary = prepare(clean);
  const leakingSummary = prepare(leaking);
  assert.equal(leakingSummary.melodyEvents, cleanSummary.melodyEvents);
  assert.equal(leakingSummary.timelineHash, cleanSummary.timelineHash);

  const changed = structuredClone(clean);
  changed[0].melodyResults[0].result.notes[0].note += 1;
  assert.notEqual(prepare(changed).timelineHash, cleanSummary.timelineHash);
});

test("non-loop playback remains alive until the exact canonical boundary", (t) => {
  const engine = new SampleAccurateAudioEngine();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let armed = null;
  let stopped = 0;

  t.after(() => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    engine.stop();
  });

  globalThis.setTimeout = (callback, delay) => {
    armed = { callback, delay };
    return 99;
  };
  globalThis.clearTimeout = () => {};

  // Reproduce the former look-ahead truncation: at 140 BPM the scheduler
  // observes the one-step end at t=0.107s while the clock is still t=0.100s.
  engine.ctx = { currentTime: 0.1, state: "running" };
  engine.isPlaying = true;
  engine.isLooping = false;
  engine.bpm = 140;
  engine.transportStartTime = 0;
  engine.patternLengthSteps = 1;
  engine.nextAbsoluteStep = 1;
  engine.indexedEvents = [{
    step: 0,
    melodyNotes: [],
    grooveEvents: [],
    drumKit: "trap-808",
  }];
  engine.wakeTimer = setInterval(() => {}, 1_000);
  engine.onStopCallback = () => { stopped += 1; };

  engine.scheduleTick();

  assert.equal(engine.getIsPlaying(), true, "look-ahead must not stop audio early");
  assert.ok(armed);
  assert.ok(armed.delay > 7 && armed.delay < 8);
  assert.equal(stopped, 0);

  armed.callback();
  assert.equal(engine.getIsPlaying(), false);
  assert.equal(stopped, 1);
});
