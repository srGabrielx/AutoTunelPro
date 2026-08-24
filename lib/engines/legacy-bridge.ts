import { generateBass } from "./bass.ts";
import { generateDrums } from "./drums.ts";
import type {
  BassNote,
  BassResult,
  DrumHit,
  DrumResult,
  GenerateOptions,
} from "../music/types.ts";
import { deriveSeed, makeSeed, rng } from "../music/random.ts";

const STEPS_PER_BAR = 16;

function clampVelocity(value: number): number {
  return Math.max(1, Math.min(127, Math.round(value)));
}

function normalizeBassNotes(notes: BassNote[]): BassNote[] {
  const monophonic = new Map<number, BassNote>();

  for (const note of notes) {
    if (!Number.isFinite(note.step) || !Number.isFinite(note.note)) continue;
    const step = Math.trunc(note.step);
    if (step < 0 || step >= STEPS_PER_BAR) continue;

    const normalized: BassNote = {
      ...note,
      step,
      note: Math.max(0, Math.min(127, Math.round(note.note))),
      velocity: clampVelocity(note.velocity),
      duration: Math.max(
        1,
        Math.min(STEPS_PER_BAR - step, Math.trunc(note.duration) || 1),
      ),
    };

    const previous = monophonic.get(step);
    if (!previous || normalized.velocity > previous.velocity) {
      monophonic.set(step, normalized);
    }
  }

  return [...monophonic.values()].sort((left, right) => left.step - right.step);
}

function applyPatternMode(
  hits: DrumHit[],
  options: GenerateOptions,
  seed: number,
): DrumHit[] {
  const pattern = options.drumPattern ?? "standard";
  const random = rng(deriveSeed(seed, "legacy-drums", pattern));
  let transformed = hits.map((hit) => ({ ...hit }));

  if (pattern === "half-time") {
    transformed = transformed.filter((hit) => {
      if (hit.drum === "snare" || hit.drum === "clap") return hit.step === 8;
      if (hit.drum === "kick") return hit.step === 0 || hit.step >= 8;
      return hit.step % 2 === 0;
    });
    if (!transformed.some((hit) =>
      hit.step === 8 && (hit.drum === "snare" || hit.drum === "clap")
    )) {
      transformed.push({ step: 8, drum: "snare", velocity: 108, microTimingMs: 0 });
    }
  } else if (pattern === "double-time") {
    for (const step of [4, 12]) {
      if (!transformed.some((hit) =>
        hit.step === step && (hit.drum === "snare" || hit.drum === "clap")
      )) {
        transformed.push({
          step,
          drum: "snare",
          velocity: clampVelocity(96 + random() * 16),
          microTimingMs: 0,
        });
      }
    }
  } else if (pattern === "triplet-rolls") {
    transformed = transformed.map((hit) => {
      if (hit.drum !== "hat" || hit.step % 2 === 0) return hit;
      return {
        ...hit,
        roll: hit.roll ?? { count: 3, velocityCurve: "decrescendo" },
      };
    });
  }

  return transformed;
}

function normalizeDrumHits(hits: DrumHit[]): DrumHit[] {
  const unique = new Map<string, DrumHit>();

  for (const hit of hits) {
    if (!Number.isFinite(hit.step)) continue;
    const step = Math.trunc(hit.step);
    if (step < 0 || step >= STEPS_PER_BAR) continue;

    const normalized: DrumHit = {
      ...hit,
      step,
      velocity: clampVelocity(hit.velocity),
      microTimingMs: hit.microTimingMs === undefined
        ? undefined
        : Math.max(-15, Math.min(15, Math.round(hit.microTimingMs))),
    };
    const key = `${step}:${normalized.drum}:${JSON.stringify(normalized.roll ?? null)}`;
    const previous = unique.get(key);
    if (!previous || normalized.velocity > previous.velocity) {
      unique.set(key, normalized);
    }
  }

  return [...unique.values()].sort((left, right) =>
    left.step - right.step || left.drum.localeCompare(right.drum)
  );
}

/**
 * Compatibility adapter for the one-bar API contract.
 *
 * The previous bridge invoked GENERATE_ARRANGEMENT for every API call and then
 * flattened a forty-bar state into a one-bar legacy result. The routes now use
 * the existing one-bar engines directly and enforce the adapter boundary.
 */
export async function runLegacyBassPipeline(
  options: GenerateOptions,
): Promise<BassResult> {
  const seed = makeSeed(options.seed);
  const result = generateBass({ ...options, seed });
  return { ...result, seed, notes: normalizeBassNotes(result.notes) };
}

export async function runLegacyDrumsPipeline(
  options: GenerateOptions,
): Promise<DrumResult> {
  const seed = makeSeed(options.seed);
  const result = generateDrums({ ...options, seed });
  const hits = normalizeDrumHits(applyPatternMode(result.hits, options, seed));
  return {
    ...result,
    seed,
    patternMode: options.drumPattern ?? "standard",
    hits,
  };
}
