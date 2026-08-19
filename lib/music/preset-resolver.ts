import { getPreset, type PresetDefinition } from '../presets/catalog.ts';
import type { DrumProfile, MelodyProfile, BassProfile, StyleId } from './types.ts';
import { STYLES } from './styles.ts';
import { GENRE_MELODY_PROFILES } from '../engines/melody-context.ts';

/**
 * Resolve o profile completo de um preset pelo ID. 
 * Se o preset não existir no catálogo, cria um fallback determinístico 
 * a partir das tabelas legadas estáticas (STYLES e GENRE_MELODY_PROFILES).
 */
export function resolvePresetProfile(presetId: string | undefined, styleId: StyleId): PresetDefinition {
  if (presetId) {
    const preset = getPreset(presetId);
    if (preset) return preset;
  }
  
  // Fallback baseado nos arrays legados estáticos
  const baseStyle = STYLES[styleId] ?? STYLES["trap-br"];
  const baseMelody = GENRE_MELODY_PROFILES[styleId] ?? GENRE_MELODY_PROFILES["trap-br"];
  
  return {
    id: `fallback-${styleId}`,
    version: 1,
    label: baseStyle.label,
    genre: styleId,
    tags: [],
    bpmRange: [baseStyle.bpm[0], baseStyle.bpm[1]],
    defaultBpm: baseStyle.bpm[0],
    rhythmicFeel: "normal",
    harmonicProfile: {
      allowedScales: ["natural-minor", "harmonic-minor", "pentatonic-minor", "dorian", "phrygian"],
      defaultScale: "natural-minor",
      complexity: 3
    },
    melodyProfile: {
      syncopation: baseMelody.syncopation,
      phraseLengths: baseMelody.motifLengths,
      densityRange: [0.3, 0.8]
    },
    bassProfile: {
      type: "808",
      slideProbability: 0.2,
      syncWithKick: 0.8,
      restProbability: 0.1
    },
    drumProfile: {
      hatRolls: true,
      kickSyncopation: 0.5,
      favoredRollCount: 2,
      ghostNoteProbability: 0.2,
      offbeatEmphasis: false
    },
    synthesisProfile: {},
    arrangementProfile: {
      energyCurve: "standard"
    }
  };
}
