export interface GenerationIdentity {
  generationId: string; // Unique ID for this generation attempt
  masterSeed: string; // Using string to support namespaced seeds explicitly

  engineVersion: string;
  schemaVersion: number; // For migrations
  presetVersion: number;

  genreId: string;
  styleId: string;
  presetId: string;

  parametersHash: string; // Hash of UI parameters used
}
