import type { PresetDefinition } from "../catalog.ts";

export const amapianoPreset: PresetDefinition = {
  id: "amapiano-default",
  version: 1,
  label: "Amapiano Groove",
  genre: "amapiano",
  tags: ["african", "log-drum", "jazz", "deep"],
  bpmRange: [110, 118],
  defaultBpm: 114,
  rhythmicFeel: "normal",

  harmonicProfile: {
    allowedScales: ["natural-major", "pentatonic-major", "dorian"],
    defaultScale: "natural-major",
    complexity: 0.4,
  },

  melodyProfile: {
    syncopation: 0.6,
    phraseLengths: [2, 4],
    densityRange: [0.3, 0.6],
  },

  bassProfile: {
    type: "log-drum",
    slideProbability: 0.2,
    syncWithKick: 0.5,
    restProbability: 0.6,
    octaveJumpProbability: 0.3,
    sustainRatio: 0.9,
  },

  drumProfile: {
    hatRolls: true,
    hatRollThreshold: 0.8,
    favoredRollCount: 3, // Shakers em tercinas (triplets)
    pitchDropProbability: 0.1,
    kickSyncopation: 0.6,
    kickDensity: 10,
    kickGapMin: 2,
    kickGapMax: 4,
    snareOn: [2, 4],
    snareDensity: 6,
    snareGapMin: 2,
    snareGapMax: 6,
    ghostNoteProbability: 0.3,
    offbeatEmphasis: true, // Polirritmia 3:3:2
  },

  synthesisProfile: {
    sub: { drive: 0.2, attack: 0.01, release: 0.6 },
    hats: { closedDecay: 0.07, openDecay: 0.2 },
  },

  arrangementProfile: {
    energyCurve: "steady",
  },
};
