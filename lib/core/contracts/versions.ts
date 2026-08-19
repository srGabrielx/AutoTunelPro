export type SchemaVersion = number;
export type EngineVersion = string;
export type PresetVersion = number;

export interface VersionContracts {
  schema: SchemaVersion;
  engine: EngineVersion;
  preset: PresetVersion;
}
