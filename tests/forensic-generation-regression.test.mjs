import test from "node:test";
import assert from "node:assert/strict";

import { generateMelody } from "../lib/engines/melody.ts";
import {
  runLegacyBassPipeline,
  runLegacyDrumsPipeline,
} from "../lib/engines/legacy-bridge.ts";

const base = {
  style: "trap-br",
  bpm: 124,
  key: "G#",
  scale: "natural-minor",
  complexity: 4,
  bassOctave: -24,
  drumPattern: "standard",
  swing: 30,
  rollDensity: 65,
  humanize: 50,
  seed: 7,
};

test("forensic: numeric seeds 0 and 1 select different deterministic streams", () => {
  const zero = generateMelody({ ...base, seed: 0 });
  const one = generateMelody({ ...base, seed: 1 });

  assert.notDeepEqual(zero.notes, one.notes);
});

test("forensic: one-block adapters never leak events beyond 16 steps", async () => {
  const [bass, drums] = await Promise.all([
    runLegacyBassPipeline(base),
    runLegacyDrumsPipeline(base),
  ]);

  assert.ok(bass.notes.every((note) => note.step >= 0 && note.step < 16));
  assert.ok(drums.hits.every((hit) => hit.step >= 0 && hit.step < 16));
});

test("forensic: bass octave changes generated pitches, not only metadata", async () => {
  const low = await runLegacyBassPipeline({ ...base, bassOctave: -36 });
  const high = await runLegacyBassPipeline({ ...base, bassOctave: -12 });

  assert.notDeepEqual(
    low.notes.map((note) => note.note),
    high.notes.map((note) => note.note),
  );
});

test("forensic: drum complexity and groove controls reach the active engine", async () => {
  const sparse = await runLegacyDrumsPipeline({
    ...base,
    complexity: 1,
    swing: 0,
    rollDensity: 0,
    humanize: 0,
  });
  const expressive = await runLegacyDrumsPipeline({
    ...base,
    complexity: 5,
    swing: 100,
    rollDensity: 100,
    humanize: 100,
  });

  assert.notDeepEqual(sparse.hits, expressive.hits);
});

test("forensic: representative genre presets do not collapse to one rhythm", async () => {
  const funk = await runLegacyDrumsPipeline({ ...base, style: "funk" });
  const amapiano = await runLegacyDrumsPipeline({ ...base, style: "amapiano" });

  assert.notDeepEqual(funk.hits, amapiano.hits);
});
