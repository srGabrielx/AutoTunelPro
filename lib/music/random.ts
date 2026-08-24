const UINT32_RANGE = 0x1_0000_0000;

/**
 * Normalizes a user supplied seed without inventing hidden entropy.
 *
 * Callers that want a new unlocked generation must advance their explicit
 * variation index. Falling back to zero keeps this low-level helper pure and
 * makes the chosen identity observable in the returned engine result.
 */
export function makeSeed(value?: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.abs(Math.trunc(value as number)) >>> 0;
}

/** A small, deterministic 32-bit generator (Mulberry32). */
export function rng(seed: number): () => number {
  let state = makeSeed(seed);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

/** Browser-safe stable string hash used for seed namespaces and metadata. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;
  return hash >>> 0;
}

/** Derives an independent numeric stream from a complete, explicit namespace. */
export function deriveSeed(
  masterSeed: number,
  ...namespace: Array<string | number>
): number {
  return hashString([makeSeed(masterSeed), ...namespace].join("|"));
}

export function hashHex(value: string): string {
  return hashString(value).toString(16).padStart(8, "0");
}

export function pick<T>(random: () => number, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)];
}
