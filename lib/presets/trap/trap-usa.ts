import type { PresetDefinition } from "../catalog.ts";

export const trapUsaPreset: PresetDefinition = {
  id: "trap-usa",
  version: 1,
  label: "Atlanta Dark Trap",
  genre: "trap",
  tags: ["atlanta", "metro", "808-heavy"],
  bpmRange: [130, 160],
  defaultBpm: 140,
  rhythmicFeel: "half-time",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "harmonic-minor", "phrygian"],
    defaultScale: "natural-minor",
    complexity: 0.45
  },
  
  melodyProfile: {
    syncopation: 0.65,
    phraseLengths: [2, 4],
    densityRange: [0.25, 0.65]
  },
  
  bassProfile: {
    type: "808",
    slideProbability: 0.4,
    syncWithKick: 0.85,
    restProbability: 0.7,
    octaveJumpProbability: 0.3,
    sustainRatio: 1.2
  },
  
  drumProfile: {
    hatRolls: true,
    hatRollThreshold: 0.78,
    favoredRollCount: 4,
    pitchDropProbability: 0.4,
    kickSyncopation: 0.75,
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
    808: { drive: 0.6, attack: 0.01, release: 1.3 },
    hats: { closedDecay: 0.09, openDecay: 0.28 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
