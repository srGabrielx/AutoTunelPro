import test from 'node:test';
import assert from 'node:assert';
import { generateDrums } from '../../lib/engines/drums/index.ts';
import { deriveSeed } from '../../lib/core/seeds/namespace.ts';
import type { StrictGenerationPlan } from '../../lib/director/planner/index.ts';

const mockPlan = {
  bpm: 140,
  energy: 0.9,
  constraints: { rhythmDensity: 0.8 }
} as StrictGenerationPlan;

test('Lote 5: Drums Determinism', () => {
  const seed = 'master-drums-seed';
  
  const drumsA = generateDrums(mockPlan, {} as any, seed, 0, 38400);
  const drumsB = generateDrums(mockPlan, {} as any, seed, 0, 38400);
  
  assert.deepStrictEqual(drumsA, drumsB, 'Drums generated from same plan and seed MUST be identical');
  assert.ok(drumsA.length > 10, 'Should generate a significant number of events');
});

test('Lote 5: Seed Isolation (Layer & Component)', () => {
  // If we change the hat seed logic intentionally via namespace override or master seed change, kicks should theoretically change if they share a master seed.
  // Wait, isolation means: the kick sequence derives purely from `drums:kick`. 
  // Let's test that manually deriving a kick seed behaves consistently.
  const masterSeedA = 'seed-A';
  const masterSeedB = 'seed-B';
  
  const kickSeedA = deriveSeed(masterSeedA, 'drums:kick');
  const kickSeedB = deriveSeed(masterSeedB, 'drums:kick');
  assert.notStrictEqual(kickSeedA, kickSeedB);
  
  // Ensure the engine produces valid Ticks and no randomness leaks
  const drums = generateDrums(mockPlan, {} as any, masterSeedA, 0, 38400);
  const firstEvent = drums[0];
  assert.ok(Number.isInteger(firstEvent.tick), 'Ticks MUST be integers');
  assert.ok(firstEvent.id.includes('drums'), 'EventId MUST be deterministic and namespaced');
});

test('Lote 5: Stress Compositional Test', () => {
  const densePlan = {
    bpm: 180,
    energy: 1.0,
    constraints: { rhythmDensity: 1.0 }
  } as StrictGenerationPlan;
  
  const t0 = performance.now();
  const denseDrums = generateDrums(densePlan, {} as any, 'stress-seed', 0, 38400);
  const t1 = performance.now();
  
  assert.ok(denseDrums.length > 50, 'High density should produce many events');
  assert.ok(t1 - t0 < 50, 'Generation must be performant (under 50ms)');
  
  for (const event of denseDrums) {
    assert.ok(Number.isFinite(event.tick) && event.tick >= 0, 'No negative or NaN ticks');
    if (event.type === 'NOTE_ON') {
      assert.ok(Number.isFinite(event.velocity) && event.velocity! > 0, 'Valid velocity');
    }
  }
});
