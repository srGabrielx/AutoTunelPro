import type { PresetDefinition } from "../catalog";

export const hiphopPreset: PresetDefinition = {
  id: "hiphop-default",
  version: 1,
  label: "Modern Hip Hop",
  genre: "hiphop",
  tags: ["modern", "urban", "bounce"],
  bpmRange: [85, 105],
  defaultBpm: 95,
  rhythmicFeel: "normal",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "natural-major", "harmonic-minor"],
    defaultScale: "natural-minor",
    complexity: 0.4
  },
  
  melodyProfile: {
    syncopation: 0.6,
    phraseLengths: [2, 4, 8],
    densityRange: [0.3, 0.6]
  },
  
  bassProfile: {
    type: "808",
    slideProbability: 0.2,
    syncWithKick: 0.8
  },
  
  drumProfile: {
    hatRolls: true, // Moderados
    kickSyncopation: 0.5,
    snareOn: [2, 4]
  },
  
  synthesisProfile: {
    808: { drive: 0.3, attack: 0.05, release: 0.9 },
    hats: { closedDecay: 0.1, openDecay: 0.25 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
