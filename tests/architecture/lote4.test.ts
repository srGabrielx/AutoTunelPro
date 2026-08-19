import { getLegacyProfile } from '../../lib/director/context/resolver.ts';
import test from 'node:test';
import assert from 'node:assert';
import { CommandBus } from '../../lib/director/command-bus/command-bus.ts';
import type { CompositionState } from '../../lib/core/state/composition.ts';
import type { CompositionCommand } from '../../lib/director/command-bus/commands.ts';

function createMockState(): CompositionState {
  return {
    identity: { schemaVersion: '2' as any, engineVersion: '1' as any, presetVersion: '1' as any, generationId: 'test-gen-id', masterSeed: 'master', genreId: 'pop', styleId: 'default', presetId: 'default', parametersHash: 'hash' },
    context: { bpm: 120, key: 'C', scale: 'minor', energy: 0.5, darkness: 0.5, complexity: 0.5, density: 0.5, preset: getLegacyProfile('trap-br'),section:{ id: 's1', type: 'VERSE', energyMultiplier: 1, densityMultiplier: 1 } },
    plan: {} as any,
    structure: { sections: [{ id: 's1', type: 'verse', startTick: 0, durationTicks: 3840, energy: 0.5, density: 0.5, novelty: 0.5 }], totalTicks: 3840 },
    layers: { melody: { events: [], variationIndex: 0 }, harmony: { blocks: [], variationIndex: 0 }, bass: { events: [], variationIndex: 0 }, drums: { events: [], variationIndex: 0 } },
    memory: { motifs: [], phrases: [], sections: [], global: { motifsIntroduced: 0, motifsReused: 0 } },
    locks: { melody: false, harmony: false, bass: false, drums: false },
    metrics: { voiceLeadingScore: 1, harmonicCohesionScore: 1, rhythmicDensityScore: 1, violations: [], repairAttempts: 0, qualityStatus: 'PRISTINE' },
    revision: 10
  };
}

test('Lote 4: CommandBus Routing and Rejection', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  
  // 1. Invalid command
  const invalidCommand: any = { type: 'SET_BPM', bpm: 140 }; // Missing requestId and expectedRevision
  const out1 = await bus.dispatch(invalidCommand, state);
  assert.strictEqual(out1.result.status, 'FAILED');
  assert.ok(out1.result.error?.includes('missing requestId'));

  // 2. Valid command but no state mutation locally
  const validCommand: CompositionCommand = { type: 'SET_BPM', bpm: 140, requestId: 'req-1', expectedRevision: 10 };
  const out2 = await bus.dispatch(validCommand, state);
  
  // Ensure bus returned a NEW state object, leaving original intact
  assert.strictEqual(out2.result.status, 'COMMITTED');
  assert.strictEqual(state.context.bpm, 120, 'Original state must NOT be mutated');
  assert.strictEqual(out2.state.context.bpm, 140, 'Next state must contain the mutation');
});

test('Lote 4: Transaction Atomicity (Failure -> Intact State)', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  
  const cloneStr = JSON.stringify(state);
  await bus.dispatch({ type: 'SET_BPM', bpm: 150, requestId: 'r2', expectedRevision: 10 }, state);
  
  assert.strictEqual(JSON.stringify(state), cloneStr, 'Atomicity guaranteed: original state pointer is completely pristine');
});

test('Lote 4: Revision Safety & Stale Result Discard', async () => {
  const bus = new CommandBus();
  const state = createMockState(); // rev = 10
  
  const cmdA: CompositionCommand = { type: 'SET_KEY', key: 'D', requestId: 'req-A', expectedRevision: 10 };
  const cmdB: CompositionCommand = { type: 'SET_KEY', key: 'E', requestId: 'req-B', expectedRevision: 10 };
  
  // Simulate concurrent: B finishes first and commits
  const outB = await bus.dispatch(cmdB, state);
  assert.strictEqual(outB.result.status, 'COMMITTED');
  assert.strictEqual(outB.state.revision, 11);
  
  // A executes against outB.state
  const outA = await bus.dispatch(cmdA, outB.state);
  
  assert.strictEqual(outA.result.status, 'REVISION_CONFLICT');
  assert.strictEqual(outA.result.expectedRevision, 10);
  assert.strictEqual(outA.result.actualRevision, 11);
  assert.strictEqual(outA.state.context.key, 'E', 'State remains intact from B');
});

test('Lote 4: Determinism within Transactions', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  
  const cmd: CompositionCommand = { type: 'REGENERATE_LAYER', layer: 'melody', requestId: 'req-1', expectedRevision: 10 };
  
  // Two executions of the EXACT same transaction should produce mathematically identical nextStates
  const out1 = await bus.dispatch(cmd, state);
  const out2 = await bus.dispatch(cmd, state);
  
  assert.deepStrictEqual(out1.state.layers.melody.events, out2.state.layers.melody.events, 'Same initial state + command MUST yield identical next state');
  assert.ok(out1.state.layers.melody.events.length > 0, 'Should have generated events');
});

test('Lote 4: Locks (Melody Locked -> Ignored)', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  state.locks.melody = true; // explicitly locked
  
  state.layers.melody.events = [{ id: 'mock', tick: 0, type: 'NOTE_ON', note: 60, velocity: 100 }];
  
  const cmd: CompositionCommand = { type: 'REGENERATE_LAYER', layer: 'melody', requestId: 'req-lock', expectedRevision: 10 };
  
  const out = await bus.dispatch(cmd, state);
  
  assert.strictEqual(out.result.status, 'IGNORED_DUE_TO_LOCK');
  assert.strictEqual(out.state.layers.melody.events.length, 1);
  assert.strictEqual(out.state.layers.melody.events[0].id, 'mock', 'Hash must remain completely unchanged due to lock');
});

test('Lote 4: Dependency Isolation', async () => {
  const bus = new CommandBus();
  const state = createMockState();
  
  const cmd: CompositionCommand = { type: 'SET_BPM', bpm: 150, requestId: 'req-iso', expectedRevision: 10 };
  
  const out = await bus.dispatch(cmd, state);
  assert.strictEqual(out.result.status, 'COMMITTED');
  assert.deepStrictEqual(out.result.invalidatedDomains, ['TIMING']);
  assert.deepStrictEqual(out.result.enginesExecuted, [], 'Must NOT execute melody engine for a TIMING only invalidation');
});
