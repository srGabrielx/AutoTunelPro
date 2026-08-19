import type { PresetDefinition } from "../catalog.ts";

export const reggaePreset: PresetDefinition = {
  id: "reggae-default",
  version: 1,
  label: "Reggae Roots",
  genre: "reggae",
  tags: ["roots", "one-drop", "chill", "skank"],
  bpmRange: [70, 95],
  defaultBpm: 80,
  rhythmicFeel: "normal",

  harmonicProfile: {
    allowedScales: ["natural-major", "natural-minor", "dorian"],
    defaultScale: "natural-major",
    complexity: 0.3,
  },

  melodyProfile: {
    syncopation: 0.8,
    phraseLengths: [2, 4],
    densityRange: [0.25, 0.55],
  },

  bassProfile: {
    type: "sub",
    slideProbability: 0.05,
    syncWithKick: 0.4,
    restProbability: 0.75, // Espaço e contratempo característicos
    octaveJumpProbability: 0.1,
    sustainRatio: 0.8,
  },

  drumProfile: {
    hatRolls: false,
    hatRollThreshold: 1.0,
    favoredRollCount: 2,
    pitchDropProbability: 0.0,
    kickSyncopation: 0.1,
    kickDensity: 4,
    kickGapMin: 4,
    kickGapMax: 8,
    snareOn: [3], // One-Drop autêntico: caixa/aro exclusivamente no beat 3
    snareDensity: 4,
    snareGapMin: 4,
    snareGapMax: 4,
    ghostNoteProbability: 0.1,
    offbeatEmphasis: true, // Ênfase nos contratempos
  },

  synthesisProfile: {
    sub: { drive: 0.1, attack: 0.02, release: 0.5 },
    hats: { closedDecay: 0.08, openDecay: 0.25 },
  },

  arrangementProfile: {
    energyCurve: "steady",
  },
};
