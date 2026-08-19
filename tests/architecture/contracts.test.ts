import test from 'node:test';
import assert from 'node:assert';
import { PPQ, beatsToTicks } from '../../lib/core/time/index.ts';
import { createDeterministicEventId } from '../../lib/core/events/index.ts';
import { compareWithGolden } from '../../lib/testing/golden.ts';

test('Lote 0: Time and PPQ Contract', () => {
  assert.strictEqual(PPQ, 960, 'PPQ should be 960');
  assert.strictEqual(beatsToTicks(1), 960, '1 beat should be 960 ticks');
});

test('Lote 0: Deterministic EventId Contract', () => {
  const id1 = createDeterministicEventId('melody', 960, 'NOTE_ON', 'hash123');
  const id2 = createDeterministicEventId('melody', 960, 'NOTE_ON', 'hash123');
  assert.strictEqual(id1, id2, 'Same inputs should yield the exact same EventId');
  assert.strictEqual(id1, 'evt:melody:960:NOTE_ON:hash123');
});

test('Lote 0: Golden Seeds Infrastructure Contract', () => {
  const golden = { id: 'test-golden', engineVersion: '1.0.0', seed: 'seed123', expectedEventsHash: 'expected-hash' };
  
  const passResult = compareWithGolden(golden, 'expected-hash');
  assert.strictEqual(passResult.pass, true);
  
  const failResult = compareWithGolden(golden, 'wrong-hash');
  assert.strictEqual(failResult.pass, false);
  assert.strictEqual(failResult.classification, 'REGRESSION');
});
