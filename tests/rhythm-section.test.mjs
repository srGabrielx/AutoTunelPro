import test from "node:test";
import assert from "node:assert/strict";
import { generateBass } from "../lib/engines/bass.ts";
import { generateDrums } from "../lib/engines/drums.ts";
import { buildCompositionPlan } from "../lib/music/composition-plan.ts";

test("Bass Engine - Harmonic Coupling", () => {
  const options = {
    style: "trap-uk",
    bpm: 140,
    complexity: 4,
    seed: 10101,
  };

  const plan = buildCompositionPlan(options);
  options.compositionPlan = plan;
  const bass = generateBass(options);

  // The first note must match the first harmonic region's root
  const firstNote = bass.notes[0];
  const firstRegion = plan.harmonicGrid[0];
  
  // bassRoot = KEYS[plan.key] + octaveOffset
  // Let's assume C (-24) = 60 - 24 = 36.
  // We can just verify the modulo 12 matches the region chordRootTone
  const pitchClass = firstNote.note % 12;
  const regionRootPitchClass = (60 /* C */ + firstRegion.chordDegrees[0]) % 12;
  
  assert.equal(pitchClass, regionRootPitchClass, "Bass downbeat must exactly match the chord root pitch class.");
});

test("Drums Engine - Discipline and Anchors", () => {
  const options = {
    style: "trap-br",
    bpm: 140,
    complexity: 3,
    seed: 20202,
  };

  const plan = buildCompositionPlan(options);
  options.compositionPlan = plan;
  const drums = generateDrums(options);

  // Verify kicks only happen on downbeats or syncopations
  const kicks = drums.hits.filter(h => h.drum === "kick");
  for (const kick of kicks) {
    const anchor = plan.rhythmicAnchors.find(a => a.step === kick.step);
    assert.ok(anchor, `Kick found at step ${kick.step} without any rhythmic anchor!`);
    assert.ok(anchor.type === "downbeat" || anchor.type === "syncopation", "Kick must only fall on downbeats or syncopations");
  }

  // Verify snares/claps only happen on backbeats
  const snares = drums.hits.filter(h => h.drum === "snare" || h.drum === "clap");
  for (const snare of snares) {
    const anchor = plan.rhythmicAnchors.find(a => a.step === snare.step);
    assert.ok(anchor, `Snare found at step ${snare.step} without any rhythmic anchor!`);
    assert.ok(anchor.type === "backbeat", "Snare must only fall on backbeats");
  }
});
