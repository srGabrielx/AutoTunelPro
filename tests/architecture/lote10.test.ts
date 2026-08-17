import test from 'node:test';
import assert from 'node:assert';
import { resolveContext } from '../../lib/director/context/resolver.ts';
import { createGenerationPlan } from '../../lib/director/planner/index.ts';
import { generateDrums } from '../../lib/engines/drums/index.ts';
import { generateMelody } from '../../lib/engines/melody/index.ts';
import { generateBass } from '../../lib/engines/bass/index.ts';

function createMockState() {
  return {
    layers: {
      harmony: {
        blocks: [
          { startTick: 0, durationTicks: 1920, rootNote: 60, id: 'b1' }
        ]
      }
    }
  } as any;
}

function generatePipeline(presetId: string, customPreset?: any) {
  const uiParams = { style: presetId };
  const section = { id: 's1', type: 'VERSE' as const, energyMultiplier: 1.0, densityMultiplier: 1.0 };
  
  const context = resolveContext(customPreset || null, uiParams, section, {});
  const plan = createGenerationPlan(context);
  const state = createMockState();
  
  const drums = generateDrums(plan, state, 'seed-1', 0, 1920);
  const melody = generateMelody(plan, state, 'seed-1', 0, 1920);
  const bass = generateBass(plan, state, 'seed-1', 0, 1920);

  return { plan, drums, melody, bass, context };
}

test('Lote 10: Determinism and Identity (Same preset + identity = same output)', () => {
  const run1 = generatePipeline('trap-br');
  const run2 = generatePipeline('trap-br');

  assert.deepStrictEqual(run1.drums, run2.drums, 'Drums must be identical');
  assert.deepStrictEqual(run1.melody, run2.melody, 'Melody must be identical');
  assert.deepStrictEqual(run1.bass, run2.bass, 'Bass must be identical');
});

test('Lote 10: Profile Isolation - Changing DrumProfile changes Drums, but leaves Melody/Harmony untouched', () => {
  const baseRun = generatePipeline('trap-br');
  
  // Clone the preset and modify only DrumProfile
  const modifiedPreset = JSON.parse(JSON.stringify(baseRun.context.preset));
  modifiedPreset.drumProfile.kickGapMax = 8;
  modifiedPreset.drumProfile.snareOn = [2, 4];
  
  const newRun = generatePipeline('trap-br', modifiedPreset);

  // Melody and Bass should be 100% identical because their profiles didn't change
  assert.deepStrictEqual(newRun.melody, baseRun.melody, 'Melody MUST remain unchanged when only DrumProfile changes');
  assert.deepStrictEqual(newRun.bass, baseRun.bass, 'Bass MUST remain unchanged when only DrumProfile changes');

  // Drums should be different
  assert.notDeepStrictEqual(newRun.drums, baseRun.drums, 'Drums MUST change when DrumProfile changes');
});

test('Lote 10: Profile Isolation - Changing MelodyProfile changes Melody, but leaves Drums untouched', () => {
  const baseRun = generatePipeline('trap-br');
  
  const modifiedPreset = JSON.parse(JSON.stringify(baseRun.context.preset));
  modifiedPreset.melodyProfile.densityRange = [0.8, 1.0]; // Make it very dense
  modifiedPreset.melodyProfile.syncopation = 1.0;
  
  const newRun = generatePipeline('trap-br', modifiedPreset);

  // Drums and Bass should be identical
  assert.deepStrictEqual(newRun.drums, baseRun.drums, 'Drums MUST remain unchanged when only MelodyProfile changes');
  assert.deepStrictEqual(newRun.bass, baseRun.bass, 'Bass MUST remain unchanged when only MelodyProfile changes');

  // Melody should be different
  assert.notDeepStrictEqual(newRun.melody, baseRun.melody, 'Melody MUST change when MelodyProfile changes');
});
