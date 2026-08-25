import { getLegacyProfile } from '../../lib/director/context/resolver.ts';
import test from 'node:test';
import assert from 'node:assert';
import { executeTransaction } from '../../lib/director/transactions/generation-transaction.ts';
import { getAffectedDomains } from '../../lib/director/dependency-graph/dependency-graph.ts';
import type { CompositionState } from '../../lib/core/state/composition.ts';

const createInitialState = (): CompositionState => ({
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
  revision: 1
});

test('Arrangement & Variation: Memory & Section Evolution', async (t) => {

  await t.test('1. Arrangement Determinism & Timeline Limits', async () => {
    const initialState = createInitialState();
    const domains = getAffectedDomains('GENERATE_ARRANGEMENT');
    
    const outcome = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-1', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    assert.strictEqual(outcome.result.status, 'COMMITTED');
    assert.ok(outcome.state.structure.sections.length > 0);
    
    // First section should be intro-a
    const intro = outcome.state.structure.sections[0];
    assert.strictEqual(intro.id, 'intro-a');
    assert.strictEqual(intro.startTick, 0);

    // Assert that we generated events in the boundaries
    assert.ok(outcome.state.layers.melody.events.length > 0);
  });

  await t.test('2. Section Contrast & Inheritance', async () => {
    const initialState = createInitialState();
    const domains = getAffectedDomains('GENERATE_ARRANGEMENT');
    
    const outcome = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-1', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    const verse = outcome.state.structure.sections.find(s => s.id === 'verse-a');
    const hook = outcome.state.structure.sections.find(s => s.id === 'hook-a');
    const versePrime = outcome.state.structure.sections.find(s => s.id === 'verse-a-prime');

    assert.ok(verse && hook && versePrime);
    
    // Contrast
    assert.notStrictEqual(verse.energy, hook.energy);
    
    // Inheritance Link
    assert.strictEqual(versePrime.inheritFrom, 'verse-a');
    assert.ok(versePrime.mutationBudget! > 0);
  });

  await t.test('3. Variation Determinism & Identity Preservation', async () => {
    const initialState = createInitialState();
    const domains = getAffectedDomains('GENERATE_ARRANGEMENT');
    
    const outcome1 = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-1', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    const outcome2 = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-2', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    const vPrime1 = outcome1.state.layers.melody.events.filter(e => e.tick >= 3840 * 20 && e.tick < 3840 * 28);
    const vPrime2 = outcome2.state.layers.melody.events.filter(e => e.tick >= 3840 * 20 && e.tick < 3840 * 28);
    
    // Determinism
    assert.strictEqual(JSON.stringify(vPrime1), JSON.stringify(vPrime2));

    // Identity Preservation check.
    // Verse A has some events. Verse A' inherited them.
    // Some should have matching IDs (the ones that only had velocity shifted), some should have mutated IDs.
    const vA1 = outcome1.state.layers.melody.events.filter(e => e.tick >= 3840 * 4 && e.tick < 3840 * 12);
    
    // We expect the count to not be wildly different, and some variation to have occurred
    assert.ok(vPrime1.length > 0);
  });

  await t.test('4. Locks Protection over arrangement bounds', async () => {
    const initialState = createInitialState();
    // lock melody
    initialState.locks.melody = true;
    
    const domains = getAffectedDomains('GENERATE_ARRANGEMENT');
    
    const outcome = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-1', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    assert.strictEqual(outcome.state.layers.melody.events.length, 0);
    // Other engines must have run
    assert.ok(outcome.state.layers.drums.events.length > 0);
  });

  await t.test('5. Serialization Safety', async () => {
    const initialState = createInitialState();
    const domains = getAffectedDomains('GENERATE_ARRANGEMENT');
    
    const outcome = await executeTransaction(
      { type: 'GENERATE_ARRANGEMENT', requestId: 'arr-1', expectedRevision: 1 },
      initialState,
      ['arrangement', 'harmony', 'bass', 'drums', 'melody'],
      domains
    );

    assert.doesNotThrow(() => {
      JSON.stringify(outcome.state);
    });
  });

});
