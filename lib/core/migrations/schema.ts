import type { CompositionState } from '../state/composition.ts';
import type { SchemaVersion } from '../contracts/versions.ts';

/**
 * Base type for a schema migration function.
 */
export type MigrationFn = (oldState: any) => CompositionState;

export interface MigrationMap {
  [fromVersion: number]: MigrationFn;
}

/**
 * RULE: The database only records generation. The database does NOT make musical decisions.
 * This helper ensures a loaded JSON state from persistence is always migrated to the current schema.
 */
export function migrateToCurrentSchema(
  persistedData: any,
  currentSchemaVersion: SchemaVersion,
  migrations: MigrationMap
): CompositionState {
  let state = persistedData;
  let version = state.identity?.schemaVersion ?? 1;

  while (version < currentSchemaVersion) {
    const migrate = migrations[version];
    if (!migrate) {
      throw new Error(`Missing migration path from schema v${version} to v${version + 1}`);
    }
    state = migrate(state);
    version++;
    if (!state.identity) state.identity = {} as any;
    state.identity.schemaVersion = version;
  }

  return state as CompositionState;
}
