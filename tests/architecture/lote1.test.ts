import test from 'node:test';
import assert from 'node:assert';
import { deriveSeed } from '../../lib/core/seeds/namespace.ts';
import { migrateToCurrentSchema } from '../../lib/core/migrations/schema.ts';
import type { CompositionState } from '../../lib/core/state/composition.ts';

test('Lote 1: Seed Derivation Determinism and Isolation', () => {
  const master = 'autotunel-master-seed-2026';
  
  const drumsHat1 = deriveSeed(master, 'drums:hats:hook:phrase-02');
  const drumsHat2 = deriveSeed(master, 'drums:hats:hook:phrase-02');
  
  const melody1 = deriveSeed(master, 'melody:hook:phrase-02');

  assert.strictEqual(drumsHat1, drumsHat2, 'Same master and namespace MUST yield identical seed');
  assert.notStrictEqual(drumsHat1, melody1, 'Different namespaces MUST isolate seeds');
  
  // Changing master seed must change all derived seeds
  const masterV2 = 'autotunel-master-seed-2027';
  const drumsHatV2 = deriveSeed(masterV2, 'drums:hats:hook:phrase-02');
  assert.notStrictEqual(drumsHat1, drumsHatV2, 'New master seed MUST yield new derived seeds');
});

test('Lote 1: Schema Migration Persistence Rule', () => {
  // Simulate loading from a database at schema v1
  const persistedStateV1 = {
    identity: { schemaVersion: 1, generationId: 'legacy-123' },
    // old fields that need to be mapped to plan
    oldSettings: { speed: 120 }
  };

  const migrations = {
    1: (old: any) => {
      // V1 to V2 migration: mapped oldSettings to plan
      return {
        ...old,
        plan: { bpm: old.oldSettings.speed },
        oldSettings: undefined,
        identity: { ...old.identity, schemaVersion: 2 }
      };
    },
    2: (old: any) => {
      // V2 to V3 migration: initialized layers
      return {
        ...old,
        layers: { melody: { events: [], variationIndex: 0 }, harmony: { blocks: [], variationIndex: 0 }, bass: { events: [], variationIndex: 0 }, drums: { events: [], variationIndex: 0 } },
        identity: { ...old.identity, schemaVersion: 3 }
      };
    }
  };

  const currentState = migrateToCurrentSchema(persistedStateV1, 3, migrations);
  
  assert.strictEqual(currentState.identity.schemaVersion, 3, 'Must migrate to target schema version');
  assert.strictEqual((currentState.plan as any).bpm, 120, 'Must map properties correctly without losing context');
  assert.ok(currentState.layers.melody, 'Must initialize new schema structures');
});

test('Lote 1: CompositionState Serializability', () => {
  // Prove that a state containing the baseline fields can be serialized
  // If someone adds an AudioNode or function here, JSON.stringify would strip it, but TypeScript would fail 
  // to allow it in the interface. Here we test that a valid state is purely POJO.
  const state = {
    identity: { schemaVersion: '2' as any, engineVersion: '1' as any, presetVersion: '1' as any, generationId: 'test-gen-id', masterSeed: 'master', genreId: 'pop', styleId: 'default', presetId: 'default', parametersHash: 'hash' } as any,
    context: {} as any,
    plan: {},
    structure: { sections: [], totalTicks: 0 },
    layers: { melody: { events: [], variationIndex: 0 }, harmony: { blocks: [], variationIndex: 0 }, bass: { events: [], variationIndex: 0 }, drums: { events: [], variationIndex: 0 } },
    memory: { motifs: [], phrases: [], sections: [], global: { motifsIntroduced: 0, motifsReused: 0 } },
    locks: {},
    metrics: { voiceLeadingScore: 1, harmonicCohesionScore: 1, rhythmicDensityScore: 1, violations: [], repairAttempts: 0, qualityStatus: 'PRISTINE' },
    revision: 1
  } as unknown as CompositionState;

  try {
    const serialized = JSON.stringify(state);
    const deserialized = JSON.parse(serialized);
    assert.deepStrictEqual(deserialized.revision, 1);
  } catch (e) {
    assert.fail('CompositionState MUST be fully serializable.');
  }
});
