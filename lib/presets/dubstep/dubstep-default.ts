import type { PresetDefinition } from "../catalog.ts";

export const dubstepPreset: PresetDefinition = {
  id: "dubstep-default",
  version: 1,
  label: "Dubstep Heavy",
  genre: "dubstep",
  tags: ["heavy", "wobble", "bass", "drop"],
  bpmRange: [135, 150],
  defaultBpm: 140,
  rhythmicFeel: "half-time",

  harmonicProfile: {
    allowedScales: ["natural-minor", "phrygian", "harmonic-minor"],
    defaultScale: "natural-minor",
    complexity: 0.3,
  },

  melodyProfile: {
    syncopation: 0.7,
    phraseLengths: [2, 4],
    densityRange: [0.2, 0.45],
  },

  bassProfile: {
    type: "synth",
    slideProbability: 0.5,
    syncWithKick: 0.6,
    restProbability: 0.5,
    octaveJumpProbability: 0.35,
    sustainRatio: 1.4, // Synth bass sustentado e agressivo
  },

  drumProfile: {
    hatRolls: false,
    hatRollThreshold: 1.0,
    favoredRollCount: 4,
    pitchDropProbability: 0.1,
    kickSyncopation: 0.8,
    kickDensity: 8,
    kickGapMin: 2,
    kickGapMax: 6,
    snareOn: [3], // Caixa forte em half-time no beat 3
    snareDensity: 4,
    snareGapMin: 4,
    snareGapMax: 4,
    ghostNoteProbability: 0.05,
    offbeatEmphasis: false,
  },

  synthesisProfile: {
    synth: { drive: 0.9, attack: 0.01, release: 1.5 },
    hats: { closedDecay: 0.1, openDecay: 0.4 },
  },

  arrangementProfile: {
    energyCurve: "build-drop",
  },
};
