import { createHash } from 'node:crypto';

/**
 * Derives a deterministic sub-seed based on the master seed and a specific namespace.
 * Example: deriveSeed(master, "drums:hats:hook:phrase-02")
 */
export function deriveSeed(masterSeed: string, namespace: string): string {
  return createHash('sha256')
    .update(`${masterSeed}:${namespace}`)
    .digest('hex');
}
