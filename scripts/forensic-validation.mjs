import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";

import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer.ts";
import { CANONICAL_PPQ } from "../lib/music/canonical-timeline.ts";
import { generateFullComposition } from "../lib/music/full-composition.ts";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const OUTPUT_DIR = path.join(REPOSITORY_ROOT, "outputs", "forensic-audio-grid");
const SAMPLE_RATE = 44_100;
const VARIATIONS_PER_PROFILE = 5;
const MASTER_SEED = 20_260_818;

const PROFILES = [
  {
    id: "trap-br",
    label: "Trap BR",
    config: {
      bpm: 134,
      key: "G#",
      globalScale: "natural-minor",
      complexity: 4,
      bassStyle: "trap-br",
      bassOctave: -24,
      drumStyle: "trap-br",
      drumPattern: "standard",
      swing: 24,
      rollDensity: 64,
      humanize: 42,
      melodyLayers: [
        {
          id: "lead",
          label: "Lead",
          synthType: "pluck",
          style: "trap-br",
          key: "G#",
          scale: "natural-minor",
          muted: false,
        },
      ],
    },
    render: { bassDrive: "warm", drumKit: "trap-808" },
  },
  {
    id: "funk",
    label: "Funk",
    config: {
      bpm: 130,
      key: "F#",
      globalScale: "pentatonic-minor",
      complexity: 4,
      bassStyle: "funk",
      bassOctave: -24,
      drumStyle: "funk",
      drumPattern: "double-time",
      swing: 18,
      rollDensity: 36,
      humanize: 58,
      melodyLayers: [
        {
          id: "lead",
          label: "Lead",
          synthType: "lead",
          style: "funk",
          key: "F#",
          scale: "pentatonic-minor",
          muted: false,
        },
      ],
    },
    render: { bassDrive: "overdrive", drumKit: "funk-tamborzao" },
  },
  {
    id: "amapiano",
    label: "Amapiano",
    config: {
      bpm: 112,
      key: "C#",
      globalScale: "natural-major",
      complexity: 3,
      bassStyle: "amapiano",
      bassOctave: -12,
      drumStyle: "amapiano",
      drumPattern: "triplet-rolls",
      swing: 54,
      rollDensity: 48,
      humanize: 62,
      melodyLayers: [
        {
          id: "lead",
          label: "Lead",
          synthType: "pad",
          style: "amapiano",
          key: "C#",
          scale: "natural-major",
          muted: false,
        },
      ],
    },
    render: { bassDrive: "clean", drumKit: "amapiano-log" },
  },
];

function stableSerialize(value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
  if (typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) =>
      `${JSON.stringify(key)}:${stableSerialize(item)}`
    ).join(",")}}`;
  }
  return "null";
}

function sha256(value) {
  const bytes = typeof value === "string" || Buffer.isBuffer(value)
    ? value
    : Buffer.from(value);
  return createHash("sha256").update(bytes).digest("hex");
}

function round(value, precision = 6) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function average(values) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, quantile) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil(sorted.length * quantile) - 1);
  return sorted[Math.max(0, index)];
}

function melodyLayerMetadata(config) {
  return config.melodyLayers.map((layer) => ({
    ...layer,
    label: layer.label || layer.id,
    synthType: layer.synthType || "lead",
    result: null,
  }));
}

function musicalPayload(composition) {
  return composition.blocks.map((block) => ({
    type: block.type,
    startStep: block.startStep,
    durationSteps: block.durationSteps,
    bass: block.bass.notes.map(({ step, note, velocity, duration, slide }) => ({
      step,
      note,
      velocity,
      duration,
      slide: Boolean(slide),
    })),
    drums: block.drums.hits.map(({ step, drum, velocity, roll, microTimingMs }) => ({
      step,
      drum,
      velocity,
      roll: roll ?? null,
      microTimingMs: microTimingMs ?? 0,
    })),
    melody: block.melodyResults.map(({ layerId, result }) => ({
      layerId,
      notes: result.notes.map(({ step, note, velocity, duration }) => ({
        step,
        note,
        velocity,
        duration,
      })),
    })),
  }));
}

function duplicateSummary(composition) {
  const duplicateKeys = [];
  let inspected = 0;

  function inspect(scope, values, makeKey) {
    const seen = new Set();
    for (const value of values) {
      inspected++;
      const key = `${scope}:${makeKey(value)}`;
      if (seen.has(key)) duplicateKeys.push(key);
      else seen.add(key);
    }
  }

  for (const block of composition.blocks) {
    inspect(`${block.id}:bass`, block.bass.notes, (note) =>
      `${note.step}:${note.note}:${note.duration}:${Boolean(note.slide)}`
    );
    inspect(`${block.id}:drums`, block.drums.hits, (hit) =>
      `${hit.step}:${hit.drum}:${stableSerialize(hit.roll ?? null)}`
    );
    for (const layer of block.melodyResults) {
      inspect(`${block.id}:melody:${layer.layerId}`, layer.result.notes, (note) =>
        `${note.step}:${note.note}:${note.duration}`
      );
    }
  }

  return {
    inspected,
    exactDuplicateCount: duplicateKeys.length,
    exactDuplicateKeys: duplicateKeys,
    pass: duplicateKeys.length === 0,
  };
}

function boundsSummary(composition, renderedTimeline) {
  const violations = [];
  let inspectedSourceEvents = 0;

  for (const block of composition.blocks) {
    for (const note of block.bass.notes) {
      inspectedSourceEvents++;
      if (note.step < 0 || note.duration <= 0 || note.step + note.duration > block.durationSteps) {
        violations.push(`${block.id}:bass:${note.step}+${note.duration}`);
      }
    }
    for (const hit of block.drums.hits) {
      inspectedSourceEvents++;
      if (hit.step < 0 || hit.step >= block.durationSteps) {
        violations.push(`${block.id}:drums:${hit.drum}:${hit.step}`);
      }
    }
    for (const layer of block.melodyResults) {
      for (const note of layer.result.notes) {
        inspectedSourceEvents++;
        if (note.step < 0 || note.duration <= 0 || note.step + note.duration > block.durationSteps) {
          violations.push(`${block.id}:melody:${layer.layerId}:${note.step}+${note.duration}`);
        }
      }
    }
  }

  for (const event of renderedTimeline.events) {
    if (
      event.startTick < event.sectionStartTick
      || event.startTick >= event.sectionEndTick
      || event.endTick <= event.startTick
      || event.endTick > event.sectionEndTick
      || event.endTick > renderedTimeline.arrangementEndTick
    ) {
      violations.push(`timeline:${event.id}:${event.startTick}-${event.endTick}`);
    }
  }

  return {
    inspectedSourceEvents,
    inspectedCanonicalEvents: renderedTimeline.events.length,
    violationCount: violations.length,
    violations,
    pass: violations.length === 0,
  };
}

function kickBassSummary(composition) {
  let bassOnsets = 0;
  let exactKickAlignment = 0;
  let oneStepKickResponses = 0;
  let unrelated = 0;
  const unrelatedOnsets = [];

  for (const block of composition.blocks) {
    const kicks = new Set(
      block.drums.hits
        .filter((hit) => hit.drum === "kick")
        .map((hit) => hit.step),
    );
    for (const note of block.bass.notes) {
      bassOnsets++;
      if (kicks.has(note.step)) exactKickAlignment++;
      else if (kicks.has(note.step - 1)) oneStepKickResponses++;
      else {
        unrelated++;
        unrelatedOnsets.push(`${block.id}:${note.step}`);
      }
    }
  }

  const coordinated = exactKickAlignment + oneStepKickResponses;
  return {
    bassOnsets,
    exactKickAlignment,
    oneStepKickResponses,
    coordinated,
    unrelated,
    unrelatedOnsets,
    exactAlignmentRate: round(bassOnsets === 0 ? 0 : exactKickAlignment / bassOnsets),
    coordinationRate: round(bassOnsets === 0 ? 0 : coordinated / bassOnsets),
    pass: bassOnsets > 0 && unrelated === 0,
  };
}

function signalSummary(left, right) {
  let peak = 0;
  let sumSquares = 0;
  let nonFiniteSamples = 0;
  let clippedSamples = 0;
  const samples = left.length + right.length;

  for (const channel of [left, right]) {
    for (const sample of channel) {
      if (!Number.isFinite(sample)) {
        nonFiniteSamples++;
        continue;
      }
      const magnitude = Math.abs(sample);
      peak = Math.max(peak, magnitude);
      sumSquares += sample * sample;
      if (magnitude >= 1) clippedSamples++;
    }
  }

  return {
    peak: round(peak),
    rms: round(Math.sqrt(sumSquares / Math.max(1, samples))),
    nonFiniteSamples,
    clippedSamples,
    pass: peak > 0 && peak <= 1 && nonFiniteSamples === 0,
  };
}

function durationSummary(composition, rendered) {
  const expectedSeconds =
    (composition.timeline.arrangementEndTick / CANONICAL_PPQ) * (60 / rendered.timeline.bpm);
  const actualSeconds = rendered.left.length / rendered.sampleRate;
  const differenceSeconds = actualSeconds - expectedSeconds;

  return {
    arrangementEndTick: composition.timeline.arrangementEndTick,
    totalSteps: composition.timeline.totalSteps,
    expectedSeconds: round(expectedSeconds),
    actualSeconds: round(actualSeconds),
    differenceSeconds: round(differenceSeconds, 9),
    frames: rendered.left.length,
    sampleRate: rendered.sampleRate,
    pass: Math.abs(differenceSeconds) <= 1 / rendered.sampleRate,
  };
}

async function createEntry(profile, variationIndex, ordinal) {
  const generationStartedAt = performance.now();
  const composition = generateFullComposition({
    ...profile.config,
    seed: MASTER_SEED,
    variationIndex,
    candidateCount: 3,
  });
  const generationMs = performance.now() - generationStartedAt;
  const snapshotHashBeforeRender = sha256(stableSerialize(composition));

  const renderStartedAt = performance.now();
  const rendered = renderDspAudio({
    bpm: profile.config.bpm,
    melodyLayers: melodyLayerMetadata(profile.config),
    blocks: composition.blocks,
    loops: 1,
    tailSeconds: 0,
    sampleRate: SAMPLE_RATE,
    ...profile.render,
  });
  const renderMs = performance.now() - renderStartedAt;
  const snapshotHashAfterRender = sha256(stableSerialize(composition));

  const encodeStartedAt = performance.now();
  const wav = Buffer.from(encodeWav16Bit(rendered.left, rendered.right, rendered.sampleRate));
  const encodeMs = performance.now() - encodeStartedAt;
  const shortCid = composition.identity.generationId.replace("composition-", "");
  const filename = `${String(ordinal).padStart(2, "0")}-${profile.id}-v${String(variationIndex).padStart(2, "0")}-${shortCid}.wav`;
  const filePath = path.join(OUTPUT_DIR, filename);
  await writeFile(filePath, wav);

  const fingerprint = sha256(stableSerialize(musicalPayload(composition)));
  const duplicates = duplicateSummary(composition);
  const bounds = boundsSummary(composition, rendered.timeline);
  const kickBass = kickBassSummary(composition);
  const duration = durationSummary(composition, rendered);
  const signal = signalSummary(rendered.left, rendered.right);
  const snapshotImmutable = snapshotHashBeforeRender === snapshotHashAfterRender;
  const timelineHashParity =
    composition.timeline.hash === rendered.timelineHash
    && rendered.timelineHash === rendered.timeline.timelineHash;

  return {
    ordinal,
    profileId: profile.id,
    profileLabel: profile.label,
    variationIndex,
    cid: composition.identity.generationId,
    seed: composition.identity.masterSeed,
    config: profile.config,
    renderConfig: {
      ...profile.render,
      sampleRate: SAMPLE_RATE,
      loops: 1,
      tailSeconds: 0,
    },
    identity: composition.identity,
    hashes: {
      parameters: composition.identity.parametersHash,
      plan: composition.identity.planHash,
      timeline: composition.timeline.hash,
      renderedTimeline: rendered.timelineHash,
      musicalFingerprint: fingerprint,
      snapshotBeforeRender: snapshotHashBeforeRender,
      snapshotAfterRender: snapshotHashAfterRender,
      wavSha256: sha256(wav),
    },
    artifacts: {
      wav: path.relative(REPOSITORY_ROOT, filePath).replaceAll("\\", "/"),
      bytes: wav.byteLength,
    },
    metrics: {
      bounds,
      duplicates,
      kickBass,
      duration,
      signal,
      latencyMs: {
        generation: round(generationMs, 3),
        render: round(renderMs, 3),
        encode: round(encodeMs, 3),
        total: round(generationMs + renderMs + encodeMs, 3),
      },
      attempt: composition.identity.attempt,
      candidateCount: composition.identity.candidateCount,
      snapshotImmutable,
      timelineHashParity,
    },
    pass:
      bounds.pass
      && duplicates.pass
      && kickBass.pass
      && duration.pass
      && signal.pass
      && snapshotImmutable
      && timelineHashParity,
  };
}

function summarize(entries) {
  const allFingerprints = new Set(entries.map((entry) => entry.hashes.musicalFingerprint));
  const fingerprintsByProfile = Object.fromEntries(PROFILES.map((profile) => {
    const profileEntries = entries.filter((entry) => entry.profileId === profile.id);
    return [profile.id, {
      renders: profileEntries.length,
      unique: new Set(profileEntries.map((entry) => entry.hashes.musicalFingerprint)).size,
    }];
  }));
  const allCids = new Set(entries.map((entry) => entry.cid));
  const allTimelineHashes = new Set(entries.map((entry) => entry.hashes.timeline));
  const exactDuplicateCount = entries.reduce(
    (sum, entry) => sum + entry.metrics.duplicates.exactDuplicateCount,
    0,
  );
  const boundsViolationCount = entries.reduce(
    (sum, entry) => sum + entry.metrics.bounds.violationCount,
    0,
  );
  const bassOnsets = entries.reduce(
    (sum, entry) => sum + entry.metrics.kickBass.bassOnsets,
    0,
  );
  const coordinatedBassOnsets = entries.reduce(
    (sum, entry) => sum + entry.metrics.kickBass.coordinated,
    0,
  );
  const unrelatedBassOnsets = entries.reduce(
    (sum, entry) => sum + entry.metrics.kickBass.unrelated,
    0,
  );
  const latencies = entries.map((entry) => entry.metrics.latencyMs.total);
  const attempts = entries.reduce((histogram, entry) => {
    const attempt = String(entry.metrics.attempt);
    histogram[attempt] = (histogram[attempt] ?? 0) + 1;
    return histogram;
  }, {});
  const expectedRenders = PROFILES.length * VARIATIONS_PER_PROFILE;
  const everyProfileHasUniqueVariations = Object.values(fingerprintsByProfile)
    .every(({ renders, unique }) => renders === VARIATIONS_PER_PROFILE && unique === renders);

  const gates = {
    renderCount: entries.length === expectedRenders,
    uniqueCidPerRender: allCids.size === entries.length,
    uniqueTimelinePerRender: allTimelineHashes.size === entries.length,
    uniqueFingerprintPerRender: allFingerprints.size === entries.length,
    uniqueVariationsWithinEveryProfile: everyProfileHasUniqueVariations,
    noOutOfBoundsEvents: boundsViolationCount === 0,
    noExactSourceDuplicates: exactDuplicateCount === 0,
    kickBassCoordinated: bassOnsets > 0 && unrelatedBassOnsets === 0,
    canonicalDurationParity: entries.every((entry) => entry.metrics.duration.pass),
    timelineHashParity: entries.every((entry) => entry.metrics.timelineHashParity),
    sameSnapshotRendered: entries.every((entry) => entry.metrics.snapshotImmutable),
    finiteNonSilentAudio: entries.every((entry) => entry.metrics.signal.pass),
    everyEntryPassed: entries.every((entry) => entry.pass),
  };

  return {
    expectedRenders,
    generatedRenders: entries.length,
    uniqueCids: allCids.size,
    uniqueTimelineHashes: allTimelineHashes.size,
    uniqueMusicalFingerprints: allFingerprints.size,
    fingerprintsByProfile,
    boundsViolationCount,
    exactDuplicateCount,
    kickBass: {
      bassOnsets,
      coordinatedBassOnsets,
      unrelatedBassOnsets,
      coordinationRate: round(bassOnsets === 0 ? 0 : coordinatedBassOnsets / bassOnsets),
    },
    durationSeconds: {
      minimum: round(Math.min(...entries.map((entry) => entry.metrics.duration.actualSeconds))),
      maximum: round(Math.max(...entries.map((entry) => entry.metrics.duration.actualSeconds))),
    },
    latencyMs: {
      minimum: round(Math.min(...latencies), 3),
      average: round(average(latencies), 3),
      p95: round(percentile(latencies, 0.95), 3),
      maximum: round(Math.max(...latencies), 3),
    },
    attempts,
    gates,
    pass: Object.values(gates).every(Boolean),
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const entries = [];
  let ordinal = 1;

  for (const profile of PROFILES) {
    for (let variationIndex = 0; variationIndex < VARIATIONS_PER_PROFILE; variationIndex++) {
      const entry = await createEntry(profile, variationIndex, ordinal++);
      entries.push(entry);
      process.stdout.write(
        `${entry.pass ? "PASS" : "FAIL"} ${entry.profileId} v${variationIndex} `
        + `${entry.cid} ${entry.metrics.duration.actualSeconds}s\n`,
      );
    }
  }

  const summary = summarize(entries);
  const manifest = {
    schema: "autotunelpro-forensic-audio-grid/v1",
    generatedAt: new Date().toISOString(),
    generator: {
      script: "scripts/forensic-validation.mjs",
      masterSeed: String(MASTER_SEED),
      profiles: PROFILES.length,
      variationsPerProfile: VARIATIONS_PER_PROFILE,
      sampleRate: SAMPLE_RATE,
      loops: 1,
      tailSeconds: 0,
      canonicalPpq: CANONICAL_PPQ,
    },
    summary,
    entries,
  };
  const manifestPath = path.join(OUTPUT_DIR, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  process.stdout.write(`Manifest: ${path.relative(REPOSITORY_ROOT, manifestPath).replaceAll("\\", "/")}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (!summary.pass) process.exitCode = 1;
}

await main();
