import type { HarmonicProfile, MelodyProfile, BassProfile, DrumProfile, SynthesisProfile, ArrangementProfile } from "../music/types";

export interface PresetDefinition {
  id: string;
  version: number;
  label: string;
  genre: string;
  tags: string[];
  bpmRange: [number, number];
  defaultBpm: number;
  rhythmicFeel: "half-time" | "normal" | "double-time";
  harmonicProfile: HarmonicProfile;
  melodyProfile: MelodyProfile;
  bassProfile: BassProfile;
  drumProfile: DrumProfile;
  synthesisProfile: SynthesisProfile;
  arrangementProfile: ArrangementProfile;
  defaults?: {
    energy?: number;
    density?: number;
    complexity?: number;
    darkness?: number;
  };
}

const presetRegistry = new Map<string, PresetDefinition>();

export function registerPreset(preset: PresetDefinition) {
  presetRegistry.set(preset.id, preset);
}

export function getPreset(id: string): PresetDefinition | undefined {
  return presetRegistry.get(id);
}

export function getAllPresets(): PresetDefinition[] {
  return Array.from(presetRegistry.values());
}

// Importação e registro dos presets
import { trapBrPreset } from "./trap/trap-br.ts";
import { trapUsaPreset } from "./trap/trap-usa.ts";
import { trapUkPreset } from "./trap/trap-uk.ts";
import { reggaePreset } from "./reggae/reggae-default.ts";
import { boombapPreset } from "./boombap/boombap-default.ts";
import { funkPreset } from "./funk/funk-default.ts";
import { amapianoPreset } from "./amapiano/amapiano-default.ts";
import { hiphopPreset } from "./hiphop/hiphop-default.ts";
import { dubstepPreset } from "./dubstep/dubstep-default.ts";

registerPreset(trapBrPreset);
registerPreset(trapUsaPreset);
registerPreset(trapUkPreset);
registerPreset(reggaePreset);
registerPreset(boombapPreset);
registerPreset(funkPreset);
registerPreset(amapianoPreset);
registerPreset(hiphopPreset);
registerPreset(dubstepPreset);
