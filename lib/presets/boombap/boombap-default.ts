import type { PresetDefinition } from "../catalog";

export const boombapPreset: PresetDefinition = {
  id: "boombap-default",
  version: 1,
  label: "Boom Bap Classic",
  genre: "boombap",
  tags: ["classic", "golden-era", "swing"],
  bpmRange: [80, 95],
  defaultBpm: 88,
  rhythmicFeel: "normal",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "dorian", "harmonic-minor", "phrygian"],
    defaultScale: "natural-minor",
    complexity: 0.5
  },
  
  melodyProfile: {
    syncopation: 0.5,
    phraseLengths: [2, 4],
    densityRange: [0.4, 0.8]
  },
  
  bassProfile: {
    type: "sub",
    slideProbability: 0.05,
    syncWithKick: 0.9 // Baixo muito colado no bumbo no Boom Bap
  },
  
  drumProfile: {
    hatRolls: false,
    kickSyncopation: 0.6,
    snareOn: [2, 4] // Caixa clássica no 2 e 4
  },
  
  synthesisProfile: {
    sub: { drive: 0.1, attack: 0.02, release: 0.5 },
    hats: { closedDecay: 0.15, openDecay: 0.3 } // Hats com mais decay para swing
  },
  
  arrangementProfile: {
    energyCurve: "steady"
  }
};
