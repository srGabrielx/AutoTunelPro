import type { PresetDefinition } from "../catalog.ts";

export const boombapPreset: PresetDefinition = {
  id: "boombap-default",
  version: 1,
  label: "Boom Bap Classic",
  genre: "boombap",
  tags: ["classic", "golden-era", "90s", "swing"],
  bpmRange: [80, 95],
  defaultBpm: 88,
  rhythmicFeel: "normal",

  harmonicProfile: {
    allowedScales: ["natural-minor", "dorian", "harmonic-minor", "blues"],
    defaultScale: "natural-minor",
    complexity: 0.5,
  },

  melodyProfile: {
    syncopation: 0.5,
    phraseLengths: [2, 4],
    densityRange: [0.35, 0.7],
  },

  bassProfile: {
    type: "sub",
    slideProbability: 0.0,
    syncWithKick: 0.95, // Baixo colado no bumbo
    restProbability: 0.85,
    octaveJumpProbability: 0.15,
    sustainRatio: 0.7,
  },

  drumProfile: {
    hatRolls: false,
    hatRollThreshold: 1.0,
    favoredRollCount: 2,
    pitchDropProbability: 0.05,
    kickSyncopation: 0.45,
    kickDensity: 8,
    kickGapMin: 2,
    kickGapMax: 4,
    snareOn: [2, 4], // Backbeat tradicional no 2 e 4
    snareDensity: 8,
    snareGapMin: 2,
    snareGapMax: 4,
    ghostNoteProbability: 0.35, // Ghost notes para groove sujo
    offbeatEmphasis: false,
  },

  synthesisProfile: {
    sub: { drive: 0.15, attack: 0.01, release: 0.45 },
    hats: { closedDecay: 0.14, openDecay: 0.35 },
  },

  arrangementProfile: {
    energyCurve: "steady",
  },
};
