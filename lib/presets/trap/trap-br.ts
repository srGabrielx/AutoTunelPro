import type { PresetDefinition } from "../catalog.ts";

export const trapBrPreset: PresetDefinition = {
  id: "trap-br",
  version: 1,
  label: "Trap BR Essencial",
  genre: "trap",
  tags: ["dark", "bouncy", "mandelao"],
  bpmRange: [120, 150],
  defaultBpm: 135,
  rhythmicFeel: "half-time",
  
  harmonicProfile: {
    allowedScales: ["pentatonic-minor", "harmonic-minor", "phrygian"],
    defaultScale: "pentatonic-minor",
    complexity: 0.4
  },
  
  melodyProfile: {
    syncopation: 0.6,
    phraseLengths: [2, 4],
    densityRange: [0.3, 0.7]
  },
  
  bassProfile: {
    type: "808",
    slideProbability: 0.35,
    syncWithKick: 0.8,
    restProbability: 0.75,
    octaveJumpProbability: 0.25,
    sustainRatio: 1.1
  },
  
  drumProfile: {
    hatRolls: true,
    hatRollThreshold: 0.82,
    favoredRollCount: 4,
    pitchDropProbability: 0.35,
    kickSyncopation: 0.7,
    kickDensity: 14,
    kickGapMin: 1,
    kickGapMax: 4,
    snareOn: [3],
    snareDensity: 8,
    snareGapMin: 2,
    snareGapMax: 4,
    ghostNoteProbability: 0.05,
    offbeatEmphasis: false
  },
  
  synthesisProfile: {
    808: { drive: 0.5, attack: 0.01, release: 1.2 },
    hats: { closedDecay: 0.1, openDecay: 0.3 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
