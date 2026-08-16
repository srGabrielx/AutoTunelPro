import test from "node:test";
import assert from "node:assert/strict";
import { buildCompositionPlan } from "../lib/music/composition-plan.ts";

test("Composition Plan - Determinism", () => {
  const options = {
    style: "trap-br",
    bpm: 140,
    complexity: 3,
    seed: 12345,
  };

  const plan1 = buildCompositionPlan(options);
  const plan2 = buildCompositionPlan(options);

  // Both plans must be deeply equal due to PRNG determinism
  assert.deepEqual(plan1.harmonicGrid, plan2.harmonicGrid);
  assert.deepEqual(plan1.rhythmicAnchors, plan2.rhythmicAnchors);
});

test("Composition Plan - Timeline Integrity", () => {
  const options = {
    style: "amapiano",
    bpm: 112,
    complexity: 4,
    seed: 999,
  };

  const plan = buildCompositionPlan(options);

  assert.equal(plan.timeline.stepsPerBar, 16);
  assert.equal(plan.timeline.totalSteps, 16);

  // Harmonic grid should cover exactly 0 to totalSteps
  const totalGridDuration = plan.harmonicGrid.reduce((acc, region) => acc + (region.endStep - region.startStep), 0);
  assert.equal(totalGridDuration, 16);

  // First region starts at 0, last region ends at 16
  assert.equal(plan.harmonicGrid[0].startStep, 0);
  assert.equal(plan.harmonicGrid[plan.harmonicGrid.length - 1].endStep, 16);

  // Regions should be contiguous
  for (let i = 0; i < plan.harmonicGrid.length - 1; i++) {
    assert.equal(plan.harmonicGrid[i].endStep, plan.harmonicGrid[i + 1].startStep);
  }
});

test("Composition Plan - Pure Function / No Dependencies", () => {
  // It should run perfectly in a plain Node.js environment without window or AudioContext
  assert.equal(typeof window, "undefined", "Test environment must not have DOM window");
  
  const plan = buildCompositionPlan({
    style: "hip-hop",
    bpm: 90,
    complexity: 3,
  });

  assert.ok(plan);
  assert.ok(plan.harmonicGrid.length > 0);
});
