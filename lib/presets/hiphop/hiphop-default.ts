import type { PresetDefinition } from "../catalog.ts";

export const hiphopPreset: PresetDefinition = {
  id: "hiphop-default",
  version: 1,
  label: "Modern Hip Hop",
  genre: "hiphop",
  tags: ["modern", "urban", "bounce", "smooth"],
  bpmRange: [85, 105],
  defaultBpm: 95,
  rhythmicFeel: "normal",
  
  harmonicProfile: {
    allowedScales: ["natural-minor", "natural-major", "harmonic-minor", "dorian"],
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
    syncWithKick: 0.8,
    restProbability: 0.75,
    octaveJumpProbability: 0.2,
    sustainRatio: 1.0
  },
  
  drumProfile: {
    hatRolls: true,
    hatRollThreshold: 0.88,
    favoredRollCount: 2,
    pitchDropProbability: 0.15,
    kickDensity: 12,
    kickSyncopation: 0.5,
    kickGapMin: 2,
    kickGapMax: 4,
    snareOn: [2, 4],
    snareDensity: 8,
    snareGapMin: 2,
    snareGapMax: 4,
    ghostNoteProbability: 0.2,
    offbeatEmphasis: false
  },
  
  synthesisProfile: {
    808: { drive: 0.3, attack: 0.05, release: 0.9 },
    hats: { closedDecay: 0.1, openDecay: 0.25 }
  },
  
  arrangementProfile: {
    energyCurve: "build-drop"
  }
};
