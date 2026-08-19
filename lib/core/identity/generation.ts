import type { EngineVersion, PresetVersion, SchemaVersion } from '../contracts/versions.ts';

export interface GenerationIdentity {
  generationId: string;
  masterSeed: string;

  engineVersion: EngineVersion;
  schemaVersion: SchemaVersion;
  presetVersion: PresetVersion;

  genreId: string;
  styleId: string;
  presetId: string;

  parametersHash: string;
}
