import test from 'node:test';
import assert from 'node:assert';
import { resolveContext } from '../../lib/director/context/resolver.ts';
import { createGenerationPlan } from '../../lib/director/planner/index.ts';
import { getAffectedDomains } from '../../lib/director/dependency-graph/index.ts';

test('Director & Planner: Context Resolution and Section Multipliers', () => {
  const preset = {
    id: 'test', version: 1,
    defaults: { energy: 0.8, darkness: 0.9, complexity: 0.5, density: 0.6 },
    bpmRange: [130, 150] as [number, number],
    ranges: { bpm: [130, 150] as [number, number] }, // mantendo para não quebrar outros types
    harmonicProfile: { defaultScale: 'minor' as any, allowedScales: ['minor'] as any, complexity: 0.5 }
  } as any;

  const uiParams = { key: 'D' };
  const section = { id: 's1', type: 'VERSE' as const, energyMultiplier: 0.5, densityMultiplier: 0.8 };

  const context = resolveContext(preset, uiParams, section, {});

  assert.strictEqual(context.bpm, 140, 'Should use middle of preset range when not overridden');
  assert.strictEqual(context.key, 'D', 'Should use UI override for key');
  assert.strictEqual(context.energy, 0.4, 'Should apply section energy multiplier (0.8 * 0.5)');
  assert.strictEqual(context.density, 0.48, 'Should apply section density multiplier (0.6 * 0.8)');
});

test('Director & Planner: Generation Plan Authority', () => {
  const context = { preset: {} as any,
    bpm: 140, key: 'D', scale: 'minor', energy: 0.9, darkness: 0.8, complexity: 0.5, density: 0.8,
    section: { id: 's1', type: 'HOOK' as const, energyMultiplier: 1.0, densityMultiplier: 1.0 }
  };

  const plan = createGenerationPlan(context);

  assert.strictEqual(plan.mood, 'AGGRESSIVE', 'Plan should derive mood correctly');
  assert.strictEqual(plan.bpm, 140, 'Plan must own BPM');
  assert.strictEqual(plan.constraints.rhythmDensity, 0.8, 'Plan must set explicit constraints for engines');
});

test('Director & Planner: Dependency Graph Contracts', () => {
  const instrumentDomains = getAffectedDomains('SET_INSTRUMENT');
  assert.deepStrictEqual(instrumentDomains, ['RENDERER_ONLY'], 'Changing instrument should not invalidate generation');

  const keyDomains = getAffectedDomains('SET_KEY');
  assert.ok(keyDomains.includes('HARMONY'), 'Changing key must invalidate harmony');
  assert.ok(keyDomains.includes('MELODY'), 'Changing key must invalidate melody');
  assert.ok(!keyDomains.includes('TIMING'), 'Changing key should not invalidate timing');
});
