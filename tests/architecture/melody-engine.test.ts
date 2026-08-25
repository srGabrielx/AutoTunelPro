import test from 'node:test';
import assert from 'node:assert';
import { generateMelody } from '../../lib/engines/melody/index.ts';
import type { StrictGenerationPlan } from '../../lib/director/planner/index.ts';

test('Melody Engine: Determinism & Parameter Sensitivity', () => {
  const plan = {
    bpm: 120, scale: 'minor', key: 'C', complexity: 0.5, energy: 0.8, density: 0.8, mood: 'DARK', sectionType: 'VERSE',
    constraints: {
      rhythmDensity: 0.8,
      pitchRange: [36, 84] as [number, number],
      phraseLength: 8
    },
    melodyProfile: {
      densityRange: [0.0, 1.0], // Bypass L10 clamping for this test
      syncopation: 0.5
    }
  } as StrictGenerationPlan; // Typecasting for mocking

  const seed1 = 'mock-seed-layer-melody-1';
  
  const eventsA = generateMelody(plan, {} as any, seed1, 0, 384000);
  const eventsB = generateMelody(plan, {} as any, seed1, 0, 384000);

  // 1. Array length and objects must be strictly equal in values
  assert.strictEqual(eventsA.length, eventsB.length, 'Arrays must have same length');
  assert.deepStrictEqual(eventsA, eventsB, 'Events must be mathematically identical given the same seed');

  // 2. Different seed -> different result
  const seed2 = 'mock-seed-layer-melody-2';
  const eventsC = generateMelody(plan, {} as any, seed2, 0, 384000);
  
  assert.notDeepStrictEqual(eventsA, eventsC, 'Different seeds MUST produce different events');
  
  // 3. Changing generation plan params should change output sizes
  const planDense = { ...plan, constraints: { ...plan.constraints, rhythmDensity: 1.0 } };
  const eventsDense = generateMelody(planDense, {} as any, seed1, 0, 384000);
  assert.notStrictEqual(eventsA.length, eventsDense.length, 'Changing plan constraints must change behavior deterministically');
});
