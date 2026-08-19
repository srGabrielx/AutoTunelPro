import { generateFullComposition, hashCompositionValue } from "../lib/music/full-composition.ts";
import { makeSeed } from "../lib/music/random.ts";
import { STYLES } from "../lib/music/styles.ts";

function musicalFingerprint(composition) {
  return hashCompositionValue({
    blocks: composition.blocks.map(block => ({
      type: block.type,
      drums: block.drums.hits.length,
      bass: block.bass.notes.length,
      melody: block.melodyResults.map(m => m.result.notes.length),
      seed: block.drums.seed,
    })),
  });
}

async function runAudit() {
  console.log("=== AUDIT 1: Seed Desbloqueada (10 regenerações) ===");
  const basePayload = {
    bpm: 140,
    key: "C",
    globalScale: "natural-minor",
    complexity: 3,
    bassStyle: "trap-br",
    bassOctave: -24,
    drumStyle: "trap-br",
    drumPattern: "standard",
    melodyLayers: [
      { id: "layer-1", style: "trap-br", key: "C", scale: "natural-minor", muted: false, synthType: "lead" }
    ],
  };

  const fingerprints = new Set();
  for (let i = 0; i < 10; i++) {
    const payload = { ...basePayload, seed: makeSeed(i) }; // unlocked seed changes root seed
    const comp = generateFullComposition(payload);
    fingerprints.add(musicalFingerprint(comp));
  }
  console.log(`10 regenerações produziram ${fingerprints.size} fingerprints únicas.`);

  console.log("\n=== AUDIT 2: Diferenciação entre Gêneros ===");
  const genres = ["trap-br", "boombap-default", "amapiano"];
  
  for (const genre of genres) {
    const payload = {
      ...basePayload,
      seed: 42,
      presetId: `test-${genre}`,
      drumStyle: genre,
      bassStyle: genre,
      melodyLayers: [{ id: "layer-1", style: genre, key: "C", scale: "natural-minor", muted: false, synthType: "lead" }]
    };
    const comp = generateFullComposition(payload);
    const kicks = comp.blocks[0].drums.hits.filter(h => h.drum === "kick").length;
    const snares = comp.blocks[0].drums.hits.filter(h => h.drum === "snare" || h.drum === "clap").length;
    console.log(`[${genre}] Intro: ${kicks} kicks, ${snares} snares/claps. Hash: ${musicalFingerprint(comp).slice(0,8)}`);
  }
}

runAudit().catch(console.error);
