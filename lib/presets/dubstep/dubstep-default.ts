import type { PresetDefinition } from "../catalog";

export const dubstepPreset: PresetDefinition = {
  id: "dubstep-default",
  version: 1,
  label: "Dubstep Heavy",
  genre: "dubstep",
  tags: ["heavy", "wobble", "bass"],
  bpmRange: [135, 150],
  defaultBpm: 140,
  rhythmicFeel: "half-time",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "phrygian"],
    defaultScale: "natural-minor",
    complexity: 0.3
  },
  
  melodyProfile: {
    syncopation: 0.7,
    phraseLengths: [4, 8],
    densityRange: [0.2, 0.5] // Melodia mais esparsa para dar espaço pro baixo
  },
  
  bassProfile: {
    type: "synth", // Indica uso de um synth bass agressivo
    slideProbability: 0.5, // Wobbles e slides
    syncWithKick: 0.6
  },
  
  drumProfile: {
    hatRolls: false,
    kickSyncopation: 0.8,
    snareOn: [3] // Característico half-time, caixa forte no 3
  },
  
  synthesisProfile: {
    synth: { drive: 0.9, attack: 0.01, release: 1.5 }, // Distorção e sustain
    hats: { closedDecay: 0.1, openDecay: 0.4 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
