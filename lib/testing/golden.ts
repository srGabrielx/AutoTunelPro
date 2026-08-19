import type { EngineVersion } from '../core/contracts/versions.ts';

export type DeviationClassification = 'REGRESSION' | 'BUG_FIX' | 'INTENTIONAL_ENGINE_CHANGE';

export interface GoldenSeed {
  id: string;
  engineVersion: EngineVersion;
  seed: string;
  expectedEventsHash: string;
}

export function compareWithGolden(
  golden: GoldenSeed,
  actualHash: string
): { pass: boolean; classification?: DeviationClassification } {
  if (golden.expectedEventsHash === actualHash) {
    return { pass: true };
  }
  return { pass: false, classification: 'REGRESSION' };
}
