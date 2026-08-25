import { getLegacyProfile } from '../../lib/director/context/resolver.ts';
import test from 'node:test';
import assert from 'node:assert';
import { CommandBus } from '../../lib/director/command-bus/command-bus.ts';
import type { CompositionState } from '../../lib/core/state/composition.ts';
import type { CompositionCommand } from '../../lib/director/command-bus/commands.ts';

function createMockState(): CompositionState {
  return {
    identity: { schemaVersion: '2' as any, engineVersion: '1' as any, presetVersion: '1' as any, generationId: 'test-gen-id', masterSeed: 'master', genreId: 'pop', styleId: 'default', presetId: 'default', parametersHash: 'hash' },
    context: { bpm: 120, key: 'C', scale: 'minor', energy: 0.8, darkness: 0.5, complexity: 0.5, density: 0.8, preset: getLegacyProfile('trap-br'),section:{ id: 's1', type: 'VERSE', energyMultiplier: 1, densityMultiplier: 1 } },
    plan: {} as any,
    structure: { sections: [], totalTicks: 0 },
    layers: { 
      melody: { events: [], variationIndex: 0 }, 
      harmony: { blocks: [], variationIndex: 0 }, 
      bass: { events: [], variationIndex: 0 }, 
      drums: { events: [], variationIndex: 0 } 
    },
    memory: { motifs: [], phrases: [], sections: [], global: { motifsIntroduced: 0, motifsReused: 0 } },
    locks: { melody: false, harmony: false, bass: false, drums: false },
    metrics: { voiceLeadingScore: 1, harmonicCohesionScore: 1, rhythmicDensityScore: 1, violations: [], repairAttempts: 0, qualityStatus: 'PRISTINE' },
    revision: 10
  };
}

test('Tonal Cascade: Tonal Authority & Cascade', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  
  // 1. Initial generation of Harmony
  const cmdHarmony: CompositionCommand = { type: 'REGENERATE_LAYER', layer: 'harmony', requestId: 'req-h1', expectedRevision: 10 };
  const out1 = await bus.dispatch(cmdHarmony, state);
  
  assert.strictEqual(out1.result.status, 'COMMITTED');
  assert.ok(out1.state.layers.harmony.blocks.length > 0, 'Harmony must generate blocks');
  assert.ok(out1.state.layers.bass.events.length > 0, 'Bass MUST cascade and generate based on Harmony');
  assert.ok(out1.result.enginesExecuted.includes('harmony'));
  assert.ok(out1.result.enginesExecuted.includes('bass'), 'Bass must be executed in cascade');
  
  // Verify Tonal tracking (Bass drops 12 semitones from Harmony root)
  const firstBlockRoot = out1.state.layers.harmony.blocks[0].rootNote;
  const firstBassEvent = out1.state.layers.bass.events[0];
  assert.strictEqual(firstBassEvent.note, firstBlockRoot - 12, 'Bass note MUST be strictly anchored to Harmony root');
  
  // 2. Cascade Isolation: Regenerating Bass does NOT invalidate Harmony
  const cmdBass: CompositionCommand = { type: 'REGENERATE_LAYER', layer: 'bass', requestId: 'req-b1', expectedRevision: 11 };
  const out2 = await bus.dispatch(cmdBass, out1.state);
  
  assert.strictEqual(out2.result.status, 'COMMITTED');
  assert.ok(out2.result.enginesExecuted.includes('bass'));
  assert.ok(!out2.result.enginesExecuted.includes('harmony'), 'Harmony must NOT be executed when only Bass is regenerated');
  assert.strictEqual(out2.state.layers.harmony.variationIndex, out1.state.layers.harmony.variationIndex, 'Harmony variationIndex remains unchanged');
  assert.strictEqual(out2.state.layers.bass.variationIndex, out1.state.layers.bass.variationIndex + 1, 'Bass variationIndex increments');
});

test('Tonal Cascade: Revision Bug Fix (Administrative commands do NOT mutate music)', async () => {
  const bus = new CommandBus();
  let state = createMockState();
  
  // First generate a baseline
  const cmdInit: CompositionCommand = { type: 'REGENERATE_LAYER', layer: 'drums', requestId: 'init', expectedRevision: 10 };
  const outInit = await bus.dispatch(cmdInit, state);
  state = outInit.state;
  const baselineDrums = [...state.layers.drums.events];
  
  // Now issue administrative command SET_BPM
  const cmdBpm: CompositionCommand = { type: 'SET_BPM', bpm: 150, requestId: 'bpm-1', expectedRevision: 11 };
  const outBpm = await bus.dispatch(cmdBpm, state);
  
  assert.strictEqual(outBpm.result.status, 'COMMITTED');
  assert.deepStrictEqual(outBpm.state.layers.drums.events, baselineDrums, 'Drums events MUST remain mathematically identical. The seed bug is fixed.');
  assert.strictEqual(outBpm.state.revision, 12, 'Global revision increments');
  assert.strictEqual(outBpm.state.layers.drums.variationIndex, 1, 'Variation index does NOT increment');
});
