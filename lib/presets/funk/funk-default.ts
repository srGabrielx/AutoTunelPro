import type { PresetDefinition } from "../catalog.ts";

export const funkPreset: PresetDefinition = {
  id: "funk-default",
  version: 1,
  label: "Funk Mandelão & Tamborzão",
  genre: "funk",
  tags: ["brazil", "tamborzao", "mandelao", "punch"],
  bpmRange: [128, 150],
  defaultBpm: 132,
  rhythmicFeel: "normal",

  harmonicProfile: {
    allowedScales: ["pentatonic-minor", "phrygian", "natural-minor"],
    defaultScale: "pentatonic-minor",
    complexity: 0.3,
  },

  melodyProfile: {
    syncopation: 0.7,
    phraseLengths: [2, 4],
    densityRange: [0.2, 0.5],
  },

  bassProfile: {
    type: "sub",
    slideProbability: 0.1,
    syncWithKick: 0.85,
    restProbability: 0.7,
    octaveJumpProbability: 0.2,
    sustainRatio: 0.6, // Grave curto e seco
  },

  drumProfile: {
    hatRolls: false,
    hatRollThreshold: 1.0,
    favoredRollCount: 2,
    pitchDropProbability: 0.0,
    kickSyncopation: 0.85,
    kickDensity: 16,
    kickGapMin: 1,
    kickGapMax: 2,
    snareOn: [2, 4],
    snareDensity: 8,
    snareGapMin: 2,
    snareGapMax: 4,
    ghostNoteProbability: 0.2,
    offbeatEmphasis: true, // Caixas e cortes sincopados
  },

  synthesisProfile: {
    sub: { drive: 0.3, attack: 0.01, release: 0.4 },
    hats: { closedDecay: 0.06, openDecay: 0.18 },
  },

  arrangementProfile: {
    energyCurve: "build-drop",
  },
};
