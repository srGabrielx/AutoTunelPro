import type { CompositionState } from '../../core/state/composition.ts';
import { getPreset, type PresetDefinition } from '../../presets/catalog.ts';
import type { ScaleId } from '../../music/types.ts';

export interface UIParameters {
  bpm?: number;
  key?: string;
  scale?: string;
  energy?: number;
  complexity?: number;
  style?: string; // Legacy parameter
}

export interface SectionContext {
  id: string;
  type: 'INTRO' | 'VERSE' | 'HOOK' | 'BREAK' | 'OUTRO';
  energyMultiplier: number;
  densityMultiplier: number;
}

export interface ResolvedMusicalContext {
  bpm: number;
  key: string;
  scale: string;
  energy: number;
  darkness: number;
  complexity: number;
  density: number;
  section: SectionContext;
  preset: PresetDefinition; // L10: O profile inteiro flui para o plano
}

/**
 * LegacyPresetAdapter
 * Converte StyleIds antigos (L0-L9) para Perfis exatos equivalentes ao comportamento hardcoded antigo.
 */
export function getLegacyProfile(style: string): PresetDefinition {
  const catalogPreset = getPreset(style);
  if (catalogPreset) return catalogPreset;

  const baseProfile = {
    id: `legacy-${style}`,
    version: 1,
    label: `Legacy ${style.toUpperCase()}`,
    genre: style,
    tags: [],
    bpmRange: [100, 160] as [number, number],
    defaultBpm: 130,
    rhythmicFeel: "normal" as const,
    harmonicProfile: {
      allowedScales: ["natural-minor", "harmonic-minor"] as ScaleId[],
      defaultScale: "natural-minor" as ScaleId,
      complexity: 0.5
    },
    melodyProfile: {
      syncopation: 0.5,
      phraseLengths: [2, 4],
      densityRange: [0.3, 0.7] as [number, number]
    },
    bassProfile: {
      type: "808",
      slideProbability: 0.2,
      syncWithKick: 0.8,
      restProbability: 0.8, // 100% igual à versão antiga: rng.next() > 0.8
      octaveJumpProbability: 0.2,
      sustainRatio: 1.0,
    },
    synthesisProfile: {
      808: { drive: 0.5, attack: 0.01, release: 1.0 },
      hats: { closedDecay: 0.1, openDecay: 0.3 }
    },
    arrangementProfile: {
      energyCurve: "build-drop"
    }
  };

  switch (style) {
    case 'trap-br':
    case 'trap-uk':
    case 'trap-usa':
      return {
        ...baseProfile,
        rhythmicFeel: "half-time",
        drumProfile: {
          hatRolls: true,
          hatRollThreshold: 0.85,
          kickSyncopation: 0.6,
          kickDensity: 16,
          kickGapMin: 1,
          kickGapMax: 4,
          snareOn: [3], // Backbeat em half-time
          snareDensity: 8,
          snareGapMin: 2,
          snareGapMax: 4
        }
      };
    case 'drill':
      return {
        ...baseProfile,
        drumProfile: {
          hatRolls: true,
          hatRollThreshold: 0.85,
          kickSyncopation: 0.8,
          kickDensity: 16,
          kickGapMin: 1,
          kickGapMax: 4,
          snareOn: [3], // Drill offset snares would be configured here
          snareDensity: 8,
          snareGapMin: 2,
          snareGapMax: 4
        }
      };
    case 'hip-hop':
    case 'boom-bap':
      return {
        ...baseProfile,
        drumProfile: {
          hatRolls: false,
          kickSyncopation: 0.2,
          kickDensity: 16,
          kickGapMin: 1,
          kickGapMax: 4,
          snareOn: [2, 4], // Normal time
          snareDensity: 8,
          snareGapMin: 2,
          snareGapMax: 4
        }
      };
    case 'funk':
    case 'amapiano':
      return {
        ...baseProfile,
        drumProfile: {
          hatRolls: false,
          kickSyncopation: 0.9,
          kickDensity: 16,
          kickGapMin: 1,
          kickGapMax: 4,
          snareOn: [2, 4],
          snareDensity: 8,
          snareGapMin: 2,
          snareGapMax: 4
        }
      };
    default:
      // Se era um ID explícito, mas falhou, ou foi omitido onde precisava.
      throw new Error(`RESOLUTION_ERROR: Unknown or unsupported preset/style: ${style}`);
  }
}

/**
 * ContextResolver
 * Transforms purely static UI intent and preset constraints into the resolved intention.
 */
export function resolveContext(
  presetInput: PresetDefinition | any, 
  uiParams: UIParameters,
  section: SectionContext,
  currentState: Partial<CompositionState>
): ResolvedMusicalContext {
  // L10 Adapter: Se presetInput não for um objeto completo (ou vier vazio em testes), injeta o fallback
  let preset: PresetDefinition;
  
  if (presetInput && presetInput.id) {
    preset = presetInput;
  } else if (uiParams.style) {
    preset = getLegacyProfile(uiParams.style);
  } else {
    throw new Error('RESOLUTION_ERROR: No preset or style provided.');
  }

  const bpm = uiParams.bpm ?? Math.round((preset.bpmRange[0] + preset.bpmRange[1]) / 2);
  const key = uiParams.key ?? 'C';
  const scale = uiParams.scale ?? preset.harmonicProfile.defaultScale;
  
  // Como o manifesto antigo usava defaults.energy, mapeamos de volta pro UI
  const baseEnergy = uiParams.energy ?? preset.defaults?.energy ?? 0.5;
  const energy = Math.min(1.0, Math.max(0.0, baseEnergy * (section.energyMultiplier ?? 1.0)));
  
  const complexity = uiParams.complexity ?? preset.harmonicProfile.complexity;
  
  // Densidade base agora é independente do melodyProfile para garantir Isolamento de Perfis (L10)
  const baseDensity = preset.defaults?.density ?? 0.5;
  const density = Math.min(1.0, Math.max(0.0, baseDensity * (section.densityMultiplier ?? 1.0)));

  return {
    bpm,
    key,
    scale,
    energy,
    darkness: 0.5, // Mapeamento fixo temporário até adicionarmos ao PresetDefinition se necessário
    complexity,
    density,
    section,
    preset
  };
}
