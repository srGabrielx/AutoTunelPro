/**
 * Simple 32-bit PRNG (Mulberry32) for deterministic generation.
 * This guarantees cross-platform predictable numbers based on a string seed.
 */
export class DeterministicRNG {
  private state: number;

  constructor(seedString: string) {
    // Hash the string to a 32-bit integer seed
    let hash = 0;
    for (let i = 0; i < seedString.length; i++) {
      hash = Math.imul(31, hash) + seedString.charCodeAt(i) | 0;
    }
    this.state = hash === 0 ? 1 : hash; // Prevent 0 state
  }

  /**
   * Returns a pseudo-random float between 0 (inclusive) and 1 (exclusive)
   */
  next(): number {
    this.state = this.state + 0x6D2B79F5 | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns an integer between min (inclusive) and max (inclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }
}
