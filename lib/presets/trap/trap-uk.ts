import type { PresetDefinition } from "../catalog.ts";

export const trapUkPreset: PresetDefinition = {
  id: "trap-uk",
  version: 1,
  label: "UK Drill & Trap",
  genre: "trap",
  tags: ["drill", "london", "sliding-808", "triplets"],
  bpmRange: [138, 150],
  defaultBpm: 142,
  rhythmicFeel: "half-time",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "harmonic-minor", "phrygian", "dorian"],
    defaultScale: "natural-minor",
    complexity: 0.5
  },
  
  melodyProfile: {
    syncopation: 0.7,
    phraseLengths: [2, 4],
    densityRange: [0.2, 0.55]
  },
  
  bassProfile: {
    type: "808",
    slideProbability: 0.65,
    syncWithKick: 0.75,
    restProbability: 0.65,
    octaveJumpProbability: 0.45,
    sustainRatio: 1.25
  },
  
  drumProfile: {
    hatRolls: true,
    hatRollThreshold: 0.75,
    favoredRollCount: 3,
    pitchDropProbability: 0.6,
    kickSyncopation: 0.8,
    kickDensity: 14,
    kickGapMin: 1,
    kickGapMax: 4,
    snareOn: [3],
    snareDensity: 8,
    snareGapMin: 2,
    snareGapMax: 4,
    ghostNoteProbability: 0.1,
    offbeatEmphasis: false
  },
  
  synthesisProfile: {
    808: { drive: 0.7, attack: 0.01, release: 1.4 },
    hats: { closedDecay: 0.08, openDecay: 0.25 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
