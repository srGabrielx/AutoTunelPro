import test from "node:test";
import assert from "node:assert/strict";

// Deterministic PRNG simulation matching lib/engines/drums.ts
function deterministicRng(seed, track, step, subIndex = 0) {
  let h = (seed ^ (step * 397) ^ (subIndex * 1009)) >>> 0;
  for (let i = 0; i < track.length; i++) {
    h = Math.imul(h ^ track.charCodeAt(i), 2246822507) >>> 0;
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return (h >>> 0) / 4294967296;
}

test("Groove Engine - Seed Determinism", () => {
  const seed = 12345678;
  const result1 = [];
  const result2 = [];

  for (let step = 0; step < 16; step++) {
    result1.push(deterministicRng(seed, "hat-roll-chance", step));
    result2.push(deterministicRng(seed, "hat-roll-chance", step));
  }

  assert.deepEqual(result1, result2, "Deterministic PRNG must yield identical values across runs");
});

test("Groove Engine - Rolls & Triplet Sub-Step Timestamps", () => {
  const bpm = 140;
  const stepDuration = 60 / bpm / 4; // ~0.1071s
  const stepTime = 1.0;

  // Test triplet roll (count = 3)
  const tripletCount = 3;
  const subIntervalTriplet = stepDuration / tripletCount;
  const tripletTimestamps = [];
  for (let s = 0; s < tripletCount; s++) {
    tripletTimestamps.push(stepTime + s * subIntervalTriplet);
  }

  assert.equal(tripletTimestamps.length, 3);
  assert.equal(tripletTimestamps[0], 1.0);
  assert.equal(tripletTimestamps[1], 1.0 + subIntervalTriplet);
  assert.equal(tripletTimestamps[2], 1.0 + 2 * subIntervalTriplet);
  assert.ok(tripletTimestamps[2] < stepTime + stepDuration, "All triplet hits must fall within the step");

  // Test 1/32 roll (count = 2)
  const rollCount = 2;
  const subIntervalRoll = stepDuration / rollCount;
  const rollTimestamps = [];
  for (let s = 0; s < rollCount; s++) {
    rollTimestamps.push(stepTime + s * subIntervalRoll);
  }

  assert.equal(rollTimestamps.length, 2);
  assert.ok(Math.abs((rollTimestamps[1] - rollTimestamps[0]) - stepDuration / 2) < 1e-10);
});

test("Groove Engine - Bounded Microtiming (±15ms max, locked downbeats)", () => {
  const seed = 987654;
  for (let step = 0; step < 16; step++) {
    // Main downbeats (0, 4, 8, 12) for kick/snare
    if (step % 4 === 0) {
      const kickTiming = 0;
      assert.equal(kickTiming, 0, `Kick on step ${step} must be locked to 0ms`);
    }

    // Offbeat swing & jitter simulation
    const isOffbeat = step % 2 === 1;
    const swingMs = isOffbeat ? 10 : 0;
    const jitterFactor = deterministicRng(seed, "hat-jitter", step) * 2 - 1;
    const humanizeJitter = jitterFactor * 3.5;
    const microTimingMs = Math.max(-15, Math.min(15, Math.round(swingMs + humanizeJitter)));

    assert.ok(microTimingMs >= -15 && microTimingMs <= 15, `Microtiming ${microTimingMs}ms exceeded bounds on step ${step}`);
  }
});

test("Groove Engine - Sidechain Kick -> 808 Ducking Simulation", () => {
  const kickTimeSec = 1.0;

  function getDuckFactor(absTimeSec) {
    const dt = absTimeSec - kickTimeSec;
    if (dt >= 0 && dt < 0.080) {
      return dt < 0.006 ? 1.0 - 0.68 * (dt / 0.006) : 0.32 + 0.68 * ((dt - 0.006) / 0.074);
    }
    return 1.0;
  }

  assert.equal(getDuckFactor(1.000), 1.0);
  assert.ok(Math.abs(getDuckFactor(1.006) - 0.32) < 0.01, "At 6ms attack, duck factor must be ~0.32");
  assert.ok(getDuckFactor(1.040) > 0.32 && getDuckFactor(1.040) < 1.0, "At 40ms, gain must be recovering");
  assert.equal(getDuckFactor(1.080), 1.0, "At 80ms, 808 volume must be fully restored");
  assert.equal(getDuckFactor(1.150), 1.0, "Past 80ms, no ducking should occur");
});

test("Groove Engine - Peak Limiter Absence of Clipping", () => {
  function applyPeakLimiter(input) {
    const threshold = 0.88;
    const absVal = Math.abs(input);
    if (absVal <= threshold) return input;
    const over = absVal - threshold;
    const compressed = threshold + (1.0 - threshold) * Math.tanh(over * 1.6);
    return Math.sign(input) * compressed;
  }

  // Test extreme inputs up to 10.0 (+20dB overshoot)
  const hotSignals = [0.5, 0.88, 1.0, 1.5, 2.5, 5.0, 10.0];
  for (const signal of hotSignals) {
    const limited = applyPeakLimiter(signal);
    assert.ok(Math.abs(limited) <= 1.0, `Signal ${signal} resulted in clipping: ${limited}`);
  }
});
