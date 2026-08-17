import type { PresetDefinition } from "../catalog";

export const reggaePreset: PresetDefinition = {
  id: "reggae-default",
  version: 1,
  label: "Reggae Roots",
  genre: "reggae",
  tags: ["roots", "chill", "one-drop"],
  bpmRange: [70, 95],
  defaultBpm: 80,
  rhythmicFeel: "normal",
  
  harmonicProfile: {
    allowedScales: ["natural-major", "natural-minor"],
    defaultScale: "natural-major",
    complexity: 0.3
  },
  
  melodyProfile: {
    syncopation: 0.8,
    phraseLengths: [2, 4],
    densityRange: [0.3, 0.7]
  },
  
  bassProfile: {
    type: "sub",
    slideProbability: 0.1,
    syncWithKick: 0.3 // O baixo do reggae frequentemente foca no contratempo e "avoid the 1"
  },
  
  drumProfile: {
    hatRolls: false,
    kickSyncopation: 0.2,
    snareOn: [3] // Característico One Drop, caixa no tempo 3 (ou aro)
  },
  
  synthesisProfile: {
    sub: { drive: 0.2, attack: 0.05, release: 0.8 },
    hats: { closedDecay: 0.08, openDecay: 0.2 }
  },
  
  arrangementProfile: {
    energyCurve: "steady"
  }
};
