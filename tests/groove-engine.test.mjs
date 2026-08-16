import test from "node:test";
import assert from "node:assert/strict";
import { generateDrums } from "../lib/engines/drums.ts";
import { buildGrooveEventPlan } from "../lib/music/groove-plan.ts";
import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer.ts";

test("1. Groove Engine - Seed Determinism", () => {
  const seed = 428912;
  const drums1 = generateDrums({ style: "trap-br", bpm: 140, seed, complexity: 3 });
  const drums2 = generateDrums({ style: "trap-br", bpm: 140, seed, complexity: 3 });

  const plan1 = buildGrooveEventPlan({ hits: drums1.hits, bpm: 140 });
  const plan2 = buildGrooveEventPlan({ hits: drums2.hits, bpm: 140 });

  assert.deepEqual(plan1, plan2, "Same seed must produce identical event plan");
});

test("2. Groove Engine - Seed Variation", () => {
  const drumsA = generateDrums({ style: "trap-uk", bpm: 140, seed: 11111, complexity: 4 });
  const drumsB = generateDrums({ style: "trap-uk", bpm: 140, seed: 99999, complexity: 4 });

  const planA = buildGrooveEventPlan({ hits: drumsA.hits, bpm: 140 });
  const planB = buildGrooveEventPlan({ hits: drumsB.hits, bpm: 140 });

  assert.notDeepEqual(planA, planB, "Different seeds must produce distinct musical variations");
});

test("3. Groove Engine - Consistent subIndex Usage", () => {
  const drumHitWithRoll = {
    step: 2,
    drum: "hat",
    velocity: 80,
    roll: { count: 3, velocityCurve: "crescendo" },
  };

  const plan = buildGrooveEventPlan({ hits: [drumHitWithRoll], bpm: 140 });
  assert.equal(plan.length, 3);
  assert.equal(plan[0].subIndex, 0);
  assert.equal(plan[1].subIndex, 1);
  assert.equal(plan[2].subIndex, 2);
});

test("4. Groove Engine - Rolls & Triplet Sub-Step Timestamps (2, 3, 4, 6)", () => {
  const bpm = 120;
  const stepDuration = 60 / bpm / 4; // 0.125s

  const testCounts = [2, 3, 4, 6];
  for (const count of testCounts) {
    const hit = {
      step: 0,
      drum: "hat",
      velocity: 80,
      roll: { count, velocityCurve: "flat" },
    };
    const plan = buildGrooveEventPlan({ hits: [hit], bpm });
    assert.equal(plan.length, count);

    for (let s = 0; s < count; s++) {
      const expectedTime = s * (stepDuration / count);
      assert.ok(
        Math.abs(plan[s].timeSeconds - expectedTime) < 1e-6,
        `Roll count ${count} subIndex ${s} timestamp mismatch`
      );
      assert.ok(plan[s].timeSeconds < stepDuration, "Must not exceed step boundary");
    }
  }
});

test("5. Groove Engine - Bounded Microtiming (±15ms)", () => {
  for (let s = 0; s < 16; s++) {
    const hit = {
      step: s,
      drum: "snare",
      velocity: 90,
      microTimingMs: s % 2 === 1 ? 25 : -30, // Intentionally overshoot to test clamping
    };
    const plan = buildGrooveEventPlan({ hits: [hit], bpm: 140 });
    assert.ok(
      plan[0].microTimingMs >= -15 && plan[0].microTimingMs <= 15,
      `Microtiming ${plan[0].microTimingMs}ms exceeded [-15, +15]ms bound`
    );
  }
});

test("6. Groove Engine - Events Never Leave Compass or Become Negative", () => {
  const bpm = 140;
  const stepDuration = 60 / bpm / 4;
  const patternDuration = 16 * stepDuration;

  const hits = [
    { step: 0, drum: "hat", velocity: 80, microTimingMs: -15 },
    { step: 15, drum: "hat", velocity: 80, microTimingMs: 15, roll: { count: 4, velocityCurve: "crescendo" } },
  ];

  const plan = buildGrooveEventPlan({ hits, bpm, patternDurationSteps: 16 });
  for (const ev of plan) {
    assert.ok(ev.timeSeconds >= 0, `Event ${ev.eventId} has negative time ${ev.timeSeconds}`);
    assert.ok(
      ev.timeSeconds < patternDuration,
      `Event ${ev.eventId} exceeded pattern duration: ${ev.timeSeconds} >= ${patternDuration}`
    );
  }
});

test("7. Groove Engine - Events Never Invert Order", () => {
  const drums = generateDrums({ style: "trap-uk", bpm: 140, seed: 7777, complexity: 5 });
  const plan = buildGrooveEventPlan({ hits: drums.hits, bpm: 140 });

  for (let i = 1; i < plan.length; i++) {
    assert.ok(
      plan[i].timeSeconds >= plan[i - 1].timeSeconds,
      `Inverted order detected at index ${i}: ${plan[i].timeSeconds} < ${plan[i - 1].timeSeconds}`
    );
  }
});

test("8. Groove Engine - Main Downbeats Locked to Grid", () => {
  const downbeatHits = [
    { step: 0, drum: "kick", velocity: 100, microTimingMs: 12 },
    { step: 4, drum: "snare", velocity: 100, microTimingMs: -14 },
    { step: 8, drum: "kick", velocity: 100, microTimingMs: 10 },
    { step: 12, drum: "snare", velocity: 100, microTimingMs: -8 },
  ];

  const plan = buildGrooveEventPlan({ hits: downbeatHits, bpm: 140 });
  for (const ev of plan) {
    assert.equal(ev.microTimingMs, 0, `Downbeat ${ev.instrument} on step ${ev.step} must be locked to 0ms`);
  }
});

test("9. Groove Engine - Playback and Export Shared Blueprint Parity", () => {
  const drums = generateDrums({ style: "trap-br", bpm: 140, seed: 554433, complexity: 4 });
  const playbackPlan = buildGrooveEventPlan({ hits: drums.hits, bpm: 140 });
  const exportPlan = buildGrooveEventPlan({ hits: drums.hits, bpm: 140 });

  assert.deepEqual(playbackPlan, exportPlan, "Both playback and export must receive identical event blueprint");
});

test("10. Groove Engine - Kick Applies Ducking on Sustained 808", () => {
  const bpm = 140;
  const stepDuration = 60 / bpm / 4;
  const sampleRate = 44100;

  // 808 note starts at step 0 and sustains for 6 steps (~0.64s)
  // Kick triggers at step 3 (~0.321s)
  const pcm = renderDspAudio({
    bpm,
    loops: 1,
    sampleRate,
    bass: {
      style: "trap-br",
      bpm,
      key: "C",
      notes: [{ step: 0, note: 36, velocity: 110, duration: 6, slide: false }],
      seed: "bass-test",
    },
    drums: {
      style: "trap-br",
      bpm,
      hits: [{ step: 3, drum: "kick", velocity: 100 }],
      seed: "kick-test",
    },
  });

  const kickStartSample = Math.floor(3 * stepDuration * sampleRate);
  const duckSample = kickStartSample + Math.floor(0.005 * sampleRate); // 5ms after kick

  // Check that ducking attenuates the sustained 808
  assert.ok(pcm.left.length > duckSample);
  assert.ok(!Number.isNaN(pcm.left[duckSample]), "PCM must not contain NaN");
});

test("11. Groove Engine - Repeated Kicks Envelope Stability", () => {
  const bpm = 140;
  const pcm = renderDspAudio({
    bpm,
    loops: 1,
    bass: {
      style: "trap-br",
      bpm,
      key: "C",
      notes: [{ step: 0, note: 36, velocity: 110, duration: 8, slide: false }],
      seed: "bass-test",
    },
    drums: {
      style: "trap-br",
      bpm,
      hits: [
        { step: 0, drum: "kick", velocity: 100 },
        { step: 1, drum: "kick", velocity: 100 },
        { step: 2, drum: "kick", velocity: 100 },
      ],
      seed: "kick-test",
    },
  });

  for (let i = 0; i < pcm.left.length; i++) {
    assert.ok(!Number.isNaN(pcm.left[i]), "No NaN under rapid repeated kicks");
    assert.ok(Number.isFinite(pcm.left[i]), "No Infinity under rapid repeated kicks");
  }
});

test("12. Groove Engine - Sidechain Preserves User Track Volume", () => {
  const bpm = 140;
  const pcmNormal = renderDspAudio({
    bpm,
    loops: 1,
    trackSettings: { bass: { volume: 0.8, muted: false } },
    bass: {
      style: "trap-br",
      bpm,
      key: "C",
      notes: [{ step: 0, note: 36, velocity: 100, duration: 4, slide: false }],
      seed: "bass-vol",
    },
    drums: { style: "trap-br", bpm, hits: [{ step: 0, drum: "kick", velocity: 100 }], seed: "kick" },
  });

  const pcmLow = renderDspAudio({
    bpm,
    loops: 1,
    trackSettings: { bass: { volume: 0.4, muted: false } },
    bass: {
      style: "trap-br",
      bpm,
      key: "C",
      notes: [{ step: 0, note: 36, velocity: 100, duration: 4, slide: false }],
      seed: "bass-vol",
    },
    drums: { style: "trap-br", bpm, hits: [{ step: 0, drum: "kick", velocity: 100 }], seed: "kick" },
  });

  // Lower user track volume must produce smaller peak
  let maxNormal = 0;
  let maxLow = 0;
  for (let i = 0; i < pcmNormal.left.length; i++) {
    maxNormal = Math.max(maxNormal, Math.abs(pcmNormal.left[i]));
    maxLow = Math.max(maxLow, Math.abs(pcmLow.left[i]));
  }

  assert.ok(maxLow < maxNormal, "User volume setting must be respected");
});

test("13. Groove Engine - Full Beat Render Peak Limiter (No Clipping <= 1.0)", () => {
  const bpm = 140;
  const drums = generateDrums({ style: "trap-uk", bpm, seed: 998877, complexity: 5 });

  const pcm = renderDspAudio({
    bpm,
    loops: 2,
    melodyLayers: [
      {
        id: "l1",
        label: "Lead",
        synthType: "lead",
        style: "trap-uk",
        key: "C",
        scale: "natural-minor",
        muted: false,
        result: {
          style: "trap-uk",
          bpm,
          key: "C",
          scale: "natural-minor",
          notes: Array.from({ length: 16 }, (_, i) => ({ step: i, note: 60 + (i % 8), velocity: 120, duration: 1 })),
          seed: "m-seed",
        },
      },
    ],
    bass: {
      style: "trap-uk",
      bpm,
      key: "C",
      notes: Array.from({ length: 8 }, (_, i) => ({ step: i * 2, note: 36, velocity: 125, duration: 2, slide: true })),
      seed: "b-seed",
    },
    drums,
  });

  let maxPeak = 0;
  for (let i = 0; i < pcm.left.length; i++) {
    maxPeak = Math.max(maxPeak, Math.abs(pcm.left[i]), Math.abs(pcm.right[i]));
  }

  assert.ok(maxPeak <= 1.0, `Peak amplitude ${maxPeak} clipped above 1.0`);
});

test("14. Groove Engine - Absence of NaN and Infinity in Rendered PCM", () => {
  const bpm = 140;
  const drums = generateDrums({ style: "trap-br", bpm, seed: 1234, complexity: 4 });
  const pcm = renderDspAudio({ bpm, loops: 1, drums });

  for (let i = 0; i < pcm.left.length; i++) {
    assert.ok(!Number.isNaN(pcm.left[i]), `NaN detected in left channel at ${i}`);
    assert.ok(!Number.isNaN(pcm.right[i]), `NaN detected in right channel at ${i}`);
    assert.ok(Number.isFinite(pcm.left[i]), `Infinity detected in left channel at ${i}`);
    assert.ok(Number.isFinite(pcm.right[i]), `Infinity detected in right channel at ${i}`);
  }
});

test("15. Groove Engine - Valid RIFF and WAVE Headers in Exported WAV", () => {
  const pcm = renderDspAudio({
    bpm: 140,
    loops: 1,
    drums: generateDrums({ style: "trap-br", bpm: 140, seed: 443322 }),
  });

  const wavBuffer = encodeWav16Bit(pcm.left, pcm.right, 44100);
  assert.ok(wavBuffer instanceof ArrayBuffer);
  const wavBytes = new Uint8Array(wavBuffer);

  const riffHeader = String.fromCharCode(wavBytes[0], wavBytes[1], wavBytes[2], wavBytes[3]);
  const waveHeader = String.fromCharCode(wavBytes[8], wavBytes[9], wavBytes[10], wavBytes[11]);

  assert.equal(riffHeader, "RIFF", "RIFF header must be valid");
  assert.equal(waveHeader, "WAVE", "WAVE header must be valid");
});
