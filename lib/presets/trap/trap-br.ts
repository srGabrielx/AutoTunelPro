import type { PresetDefinition } from "../catalog";

export const trapBrPreset: PresetDefinition = {
  id: "trap-br-default",
  version: 1,
  label: "Trap BR Essencial",
  genre: "trap",
  tags: ["dark", "bouncy", "mandelao"],
  bpmRange: [120, 150],
  defaultBpm: 135,
  rhythmicFeel: "half-time",
  
  harmonicProfile: {
    // Configurações de harmonia
    allowedScales: ["pentatonic-minor", "harmonic-minor"],
    defaultScale: "pentatonic-minor",
    complexity: 0.4
  },
  
  melodyProfile: {
    syncopation: 0.6,
    phraseLengths: [2, 4],
    densityRange: [0.2, 0.6]
  },
  
  bassProfile: {
    type: "808",
    slideProbability: 0.3,
    syncWithKick: 0.8
  },
  
  drumProfile: {
    hatRolls: true,
    kickSyncopation: 0.7,
    snareOn: [3] // Half-time feel (beat 3 instead of 2 and 4)
  },
  
  synthesisProfile: {
    // Configurações do WebAudio/Synth
    808: { drive: 0.5, attack: 0.01, release: 1.2 },
    hats: { closedDecay: 0.1, openDecay: 0.3 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
