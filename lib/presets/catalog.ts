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
import { trapBrPreset } from "./trap/trap-br";
import { reggaePreset } from "./reggae/reggae-default";
import { boombapPreset } from "./boombap/boombap-default";
import { hiphopPreset } from "./hiphop/hiphop-default";
import { dubstepPreset } from "./dubstep/dubstep-default";

registerPreset(trapBrPreset);
registerPreset(reggaePreset);
registerPreset(boombapPreset);
registerPreset(hiphopPreset);
registerPreset(dubstepPreset);
