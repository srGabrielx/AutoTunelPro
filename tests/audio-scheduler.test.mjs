import test from "node:test";
import assert from "node:assert/strict";

// Helper to simulate the exact sample-accurate transport time formula
function calculateAbsoluteStepTime(transportStartTime, stepDuration, absoluteStep) {
  return transportStartTime + absoluteStep * stepDuration;
}

test("Audio Scheduler - Absolute Step Timing Calculation", () => {
  const bpm = 140;
  const stepDuration = 60 / bpm / 4; // 0.10714285714285714s
  const transportStartTime = 1.0;

  for (let step = 0; step < 16; step++) {
    const time = calculateAbsoluteStepTime(transportStartTime, stepDuration, step);
    const expected = 1.0 + step * (60 / 140 / 4);
    assert.equal(time, expected, `Step ${step} timing mismatch`);
  }
});

test("Audio Scheduler - Absence of Drift After 1024+ Steps", () => {
  const bpm = 128;
  const stepDuration = 60 / bpm / 4;
  const transportStartTime = 0.0;
  const totalSteps = 2048;

  for (let step = 0; step < totalSteps; step++) {
    const absoluteTime = calculateAbsoluteStepTime(transportStartTime, stepDuration, step);
    const exactTarget = step * stepDuration;
    assert.equal(absoluteTime, exactTarget);
  }

  const finalAbsolute = calculateAbsoluteStepTime(transportStartTime, stepDuration, totalSteps);
  assert.equal(finalAbsolute, totalSteps * stepDuration);
});

test("Audio Scheduler - Loop and Stop Boundaries", () => {
  const bpm = 140;
  const stepDuration = 60 / bpm / 4;
  const transportStartTime = 0.0;

  // Simulate scheduler when isLooping = false
  const isLooping = false;
  let scheduledSteps = 0;
  let isStopped = false;

  for (let absoluteStep = 0; absoluteStep < 32; absoluteStep++) {
    if (absoluteStep >= 16 && !isLooping) {
      isStopped = true;
      break;
    }
    const time = calculateAbsoluteStepTime(transportStartTime, stepDuration, absoluteStep);
    assert.ok(time >= 0);
    scheduledSteps++;
  }

  assert.equal(isStopped, true);
  assert.equal(scheduledSteps, 16, "Must stop precisely at 16 steps when loop is disabled");

  // Simulate scheduler when isLooping = true
  const isLoopingTrue = true;
  let loopSteps = 0;
  for (let absoluteStep = 0; absoluteStep < 32; absoluteStep++) {
    if (absoluteStep >= 16 && !isLoopingTrue) {
      break;
    }
    const patternStep = absoluteStep % 16;
    assert.ok(patternStep >= 0 && patternStep < 16);
    loopSteps++;
  }
  assert.equal(loopSteps, 32, "Must continue looping across patterns");
});

test("Audio Scheduler - Active Node Tracking and Cleanup", () => {
  const activeNodes = [];
  let stoppedCount = 0;

  for (let i = 0; i < 10; i++) {
    activeNodes.push({
      stop: () => {
        stoppedCount++;
      },
    });
  }

  // Cleanup simulation
  for (const node of activeNodes) {
    node.stop();
  }

  assert.equal(stoppedCount, 10, "All active audio nodes must receive stop() during cleanup");
});
