import {
  buildCanonicalTimeline,
  ticksToSamples,
  ticksToSeconds,
  timelineDurationSamples,
  type CanonicalArrangementBlockInput,
  type CanonicalTimelineDescriptor,
} from "../music/canonical-timeline.ts";
import {
  BASS_808_CONFIGS,
  getMelodySynthConfig,
  MASTER_BUS_CONFIG,
} from "../music/synthesis-presets.ts";
import type {
  BassDrive,
  DrumKitMode,
  MelodyLayer,
  MelodySynthType,
  TrackSettings,
} from "../music/types";

// ==========================================================
// DSP HELPERS & BIQUAD FILTER (Direct Form II Transposed)
// ==========================================================

export class BiquadFilter {
  b0 = 1;
  b1 = 0;
  b2 = 0;
  a1 = 0;
  a2 = 0;
  z1 = 0;
  z2 = 0;

  setLowpass(cutoff: number, q: number, sampleRate: number) {
    const normCutoff = Math.max(10, Math.min(sampleRate * 0.49, cutoff));
    const w0 = (2 * Math.PI * normCutoff) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (1 - cosw0) / (2 * a0);
    this.b1 = (1 - cosw0) / a0;
    this.b2 = (1 - cosw0) / (2 * a0);
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setHighpass(cutoff: number, q: number, sampleRate: number) {
    const normCutoff = Math.max(10, Math.min(sampleRate * 0.49, cutoff));
    const w0 = (2 * Math.PI * normCutoff) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (1 + cosw0) / (2 * a0);
    this.b1 = -(1 + cosw0) / a0;
    this.b2 = (1 + cosw0) / (2 * a0);
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setBandpass(centerFreq: number, q: number, sampleRate: number) {
    const normFreq = Math.max(10, Math.min(sampleRate * 0.49, centerFreq));
    const w0 = (2 * Math.PI * normFreq) / sampleRate;
    const alpha = Math.sin(w0) / (2 * Math.max(0.1, q));
    const cosw0 = Math.cos(w0);

    const a0 = 1 + alpha;
    this.b0 = (Math.sin(w0) / 2) / a0;
    this.b1 = 0;
    this.b2 = -(Math.sin(w0) / 2) / a0;
    this.a1 = (-2 * cosw0) / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(sample: number): number {
    const out = this.b0 * sample + this.z1;
    this.z1 = this.b1 * sample - this.a1 * out + this.z2;
    this.z2 = this.b2 * sample - this.a2 * out;
    return out;
  }

  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }
}

// PolyBLEP residual anti-aliasing function for step discontinuities
function polyBLEP(t: number, dt: number): number {
  if (t < dt) {
    const v = t / dt;
    return v + v - v * v - 1.0;
  } else if (t > 1.0 - dt) {
    const v = (t - 1.0) / dt;
    return v * v + v + v + 1.0;
  }
  return 0.0;
}

// Deterministic Pseudo-Random Generator (seeded LCG)
class SeededRandom {
  private seed: number;
  constructor(seed = 123456789) {
    this.seed = seed;
  }
  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
  nextNoise(): number {
    return this.next() * 2.0 - 1.0;
  }
}

// Soft-Clipping Saturation with Drive
function applyWaveshaper(sample: number, drive: BassDrive): number {
  const k = drive === "overdrive" ? 8 : drive === "warm" ? 2 : 0;
  if (k === 0) return Math.max(-1, Math.min(1, sample));
  const x = Math.max(-2, Math.min(2, sample));
  return ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
}

// ==========================================================
// WAV PCM 16-BIT ENCODER
// ==========================================================

export function encodeWav16Bit(
  left: Float32Array,
  right: Float32Array,
  sampleRate = 44100
): ArrayBuffer {
  const numChannels = 2;
  const numSamples = left.length;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write string
  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  // RIFF header
  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");

  // FMT sub-chunk
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // DATA sub-chunk
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave and apply TPDF Dither
  let offset = 44;
  let ditherR1 = 0.5;

  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < 2; ch++) {
      let sample = ch === 0 ? left[i] : right[i];
      // Soft safety clamp
      sample = Math.max(-1.0, Math.min(1.0, sample));

      // Triangular Probability Density Function (TPDF) Dither
      const ditherR2 = (Math.sin((i * 2 + ch + 1) * 12.9898) * 43758.5453) % 1;
      const tpdf = (ditherR1 + ditherR2 - 1.0) * (1.0 / 32768.0);
      ditherR1 = ditherR2;

      const dithered = sample + tpdf;
      const clamped = Math.max(-1.0, Math.min(1.0, dithered));
      const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);

      view.setInt16(offset, Math.max(-32768, Math.min(32767, int16)), true);
      offset += 2;
    }
  }

  return buffer;
}

// ==========================================================
// PURE FLOAT32 DSP SYNTHESIZER
// ==========================================================

export interface RenderDSPDspOptions {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  blocks?: CanonicalArrangementBlockInput[];
  muteBass?: boolean;
  muteDrums?: boolean;
  loops?: number;
  /** Audio-only tail. Zero by default so the musical duration stays canonical. */
  tailSeconds?: number;
  /** Reuse an already resolved descriptor instead of interpreting blocks again. */
  timeline?: CanonicalTimelineDescriptor;
  bassDrive?: BassDrive;
  drumKit?: DrumKitMode;
  sampleRate?: number;
  bassVolume?: number;  // 0 to 1
  drumsVolume?: number; // 0 to 1
  trackSettings?: Record<string, TrackSettings>; // per-layer volume lookup
}

export interface RenderDspAudioResult {
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
  timeline: CanonicalTimelineDescriptor;
  timelineHash: string;
  durationSeconds: number;
}

export function renderDspAudio({
  bpm,
  melodyLayers = [],
  blocks = [],
  muteBass = false,
  muteDrums = false,
  loops = 1,
  tailSeconds = 0,
  timeline: providedTimeline,
  bassDrive = "warm",
  drumKit = "trap-808",
  sampleRate = 44100,
  bassVolume = 1.0,
  drumsVolume = 1.0,
  trackSettings = {},
}: RenderDSPDspOptions): RenderDspAudioResult {
  const timeline =
    providedTimeline ??
    buildCanonicalTimeline({ bpm, melodyLayers, blocks, muteBass, muteDrums });
  const safeBpm = timeline.bpm;
  const stepDuration = 60 / safeBpm / 4;
  const passes = Number.isFinite(loops) ? Math.max(1, Math.floor(loops)) : 1;
  const explicitTailSeconds = Number.isFinite(tailSeconds) ? Math.max(0, tailSeconds) : 0;
  const totalSamples = timelineDurationSamples(timeline, sampleRate, {
    passes,
    tailSeconds: explicitTailSeconds,
  });

  const left = new Float32Array(totalSamples);
  const right = new Float32Array(totalSamples);

  // Stereo Delay Line Buffers
  const delaySamples = Math.max(1, Math.round(stepDuration * 1.5 * sampleRate));
  const delayBufL = new Float32Array(delaySamples);
  const delayBufR = new Float32Array(delaySamples);
  let delayPos = 0;

  const rng = new SeededRandom(777);

  // --- 1. SINTETIZAR CAMADAS DE MELODIA ---
  const activeMelodyTracks = timeline.tracks.filter((track) => track.role === "melody");
  const layerVolScale =
    activeMelodyTracks.length > 1 ? 0.72 / activeMelodyTracks.length : 1.0;

  for (let loop = 0; loop < passes; loop++) {
    const loopOffsetSec = loop * timeline.durationSeconds;
    const loopOffsetSamples = ticksToSamples(
      loop * timeline.arrangementEndTick,
      safeBpm,
      sampleRate
    );

    for (const canonicalBlock of timeline.blocks) {
      const blockEvents = timeline.events.filter(
        (event) => event.sectionId === canonicalBlock.id
      );

      activeMelodyTracks.forEach((track) => {
        if (trackSettings[track.id]?.muted) return;
        const synthType: MelodySynthType = track.synthType || "lead";
        const notes = blockEvents.filter((event) => event.trackId === track.id);

        notes.forEach((note) => {
        const startSample =
          loopOffsetSamples + ticksToSamples(note.startTick, safeBpm, sampleRate);
        const durSamples = Math.max(
          1,
          ticksToSamples(note.endTick - note.startTick, safeBpm, sampleRate)
        );
        const freq = 440 * Math.pow(2, (note.pitch - 69) / 12);
        const layerVol = trackSettings[track.id]?.volume ?? 1.0;
        const cfg = getMelodySynthConfig(synthType);
        const vel = (note.velocity / 127) * cfg.baseVol * cfg.gainCompensation * layerVolScale * layerVol;

        const filter = new BiquadFilter();
        const startCutoff = cfg.filterStartCutoff;
        const endCutoff = cfg.filterEndCutoff;
        const qVal = cfg.filterQ;

        let phase1 = 0;
        let phase2 = 0;
        const phaseInc1 = (freq * Math.pow(2, -cfg.detuneCents / 1200)) / sampleRate;
        const phaseInc2 = (freq * Math.pow(2, cfg.detuneCents / 1200)) / sampleRate;

        for (let n = 0; n < durSamples; n++) {
          const sampleIdx = startSample + n;
          if (sampleIdx >= totalSamples) break;

          const progress = n / durSamples;
          // Exponential decay amplitude
          const env = vel * Math.exp(-progress * 4.5);

          // Dynamic cutoff sweep
          const currentCutoff = startCutoff * Math.pow(endCutoff / startCutoff, progress);
          if (n % 16 === 0) {
            filter.setLowpass(currentCutoff, qVal, sampleRate);
          }

          // Oscillators with PolyBLEP
          let s1 = 0;
          if (synthType === "pad") {
            // Triangle wave
            s1 = 2.0 * Math.abs(2.0 * (phase1 - Math.floor(phase1 + 0.5))) - 1.0;
          } else {
            // Sawtooth wave with PolyBLEP
            s1 = 2.0 * phase1 - 1.0;
            s1 -= polyBLEP(phase1, phaseInc1);
          }

          // Osc 2 (Triangle / Detuned)
          let s2 = 2.0 * Math.abs(2.0 * (phase2 - Math.floor(phase2 + 0.5))) - 1.0;
          if (synthType === "pluck") {
            s2 = Math.sin(2 * Math.PI * phase2);
          }

          phase1 = (phase1 + phaseInc1) % 1.0;
          phase2 = (phase2 + phaseInc2) % 1.0;

          const mixed = (s1 * 0.6 + s2 * 0.4) * env;
          const filtered = filter.process(mixed);

          // Pan slightly according to layer index
          left[sampleIdx] += filtered * 0.95;
          right[sampleIdx] += filtered * 1.05;

          // Delay send (22% gain)
          const dIn = filtered * 0.22;
          const dOutL = delayBufL[delayPos];
          const dOutR = delayBufR[delayPos];

          delayBufL[delayPos] = dIn + dOutR * 0.35; // cross feedback
          delayBufR[delayPos] = dIn + dOutL * 0.35;
          delayPos = (delayPos + 1) % delaySamples;

          left[sampleIdx] += dOutL * 0.7;
          right[sampleIdx] += dOutR * 0.7;
        }
      });
    });

    const drumEvents = blockEvents.filter((event) => event.role === "drums");
    const kickTimes = drumEvents
      .filter((event) => event.instrument === "kick")
      .map((event) => loopOffsetSec + ticksToSeconds(event.startTick, safeBpm));

    const effectiveBassVol = trackSettings["bass"]?.volume ?? bassVolume;
    const effectiveDrumsVol = trackSettings["drums"]?.volume ?? drumsVolume;

    // --- 2. SINTETIZAR 808 SUB-BASS (Parallel Clean Sub + Saturated Harmonics) ---
    const bassEvents = blockEvents.filter((event) => event.role === "bass");
    if (!muteBass && bassEvents.length > 0 && !trackSettings["bass"]?.muted) {
      const cfg = BASS_808_CONFIGS[bassDrive] || BASS_808_CONFIGS.warm;

      bassEvents.forEach((bNote) => {
        const startSec = loopOffsetSec + ticksToSeconds(bNote.startTick, safeBpm);
        const startSample =
          loopOffsetSamples + ticksToSamples(bNote.startTick, safeBpm, sampleRate);
        const durSamples = Math.max(
          1,
          ticksToSamples(bNote.endTick - bNote.startTick, safeBpm, sampleRate)
        );
        const rootFreq = 440 * Math.pow(2, (bNote.pitch - 69) / 12);
        const baseVel = (bNote.velocity / 127) * 0.52 * effectiveBassVol;

        let phase = 0;

        for (let n = 0; n < durSamples; n++) {
          const sampleIdx = startSample + n;
          if (sampleIdx >= totalSamples) break;

          const progress = n / durSamples;
          const timeSec = n / sampleRate;
          const absTimeSec = startSec + timeSec;

          // Pitch dive envelope: configurable start factor & duration
          let currentFreq = rootFreq;
          if (timeSec < cfg.pitchDiveDurationSec) {
            const diveFactor =
              cfg.pitchDiveStartMultiplier -
              (cfg.pitchDiveStartMultiplier - 1.0) * (timeSec / cfg.pitchDiveDurationSec);
            currentFreq = rootFreq * diveFactor;
          } else if (bNote.slide && progress > 0.3) {
            const slideProg = (progress - 0.3) / 0.7;
            currentFreq = rootFreq * (1.0 + 0.45 * slideProg);
          }

          const phaseInc = currentFreq / sampleRate;
          phase = (phase + phaseInc) % 1.0;

          const env = baseVel * Math.exp(-progress * 2.8);
          const rawSine = Math.sin(2 * Math.PI * phase) * env;

          // Sidechain Kick -> 808 ducking factor
          let duckFactor = 1.0;
          for (let k = 0; k < kickTimes.length; k++) {
            const dt = absTimeSec - kickTimes[k];
            if (dt >= 0 && dt < 0.080) {
              const kDuck = dt < 0.005 ? 1.0 - 0.68 * (dt / 0.005) : 0.32 + 0.68 * ((dt - 0.005) / 0.075);
              duckFactor = Math.min(duckFactor, kDuck);
            }
          }

          // Parallel Saturation: Clean Sub + Saturated Upper Harmonics
          const cleanSub = rawSine * cfg.cleanSubGain * duckFactor;
          const saturatedMid = applyWaveshaper(rawSine * duckFactor, bassDrive) * cfg.parallelSatGain;
          const satSample = cleanSub + saturatedMid;

          left[sampleIdx] += satSample;
          right[sampleIdx] += satSample;
        }
      });
    }

    // --- 3. SINTETIZAR DRUMS (Kick, Snare, Hi-Hats from Single Groove Plan) ---
    if (!muteDrums && drumEvents.length > 0 && !trackSettings["drums"]?.muted) {
      drumEvents.forEach((ev) => {
        const startSample =
          loopOffsetSamples + ticksToSamples(ev.startTick, safeBpm, sampleRate);
        const currentVel = ev.velocity;

        if (ev.instrument === "kick") {
          const durSec = 0.34;
          const durSamples = Math.floor(durSec * sampleRate);
          const startF = drumKit === "drill-punch" ? 180 : drumKit === "funk-tamborzao" ? 140 : 155;
          const endF = drumKit === "funk-tamborzao" ? 52 : 44;
          const vel = (currentVel / 127) * (drumKit === "funk-tamborzao" ? 0.56 : 0.48) * effectiveDrumsVol;

          let phase = 0;
          for (let n = 0; n < durSamples; n++) {
            const sampleIdx = startSample + n;
            if (sampleIdx >= totalSamples) break;

            const t = n / sampleRate;
            const progress = n / durSamples;
            const f = t < 0.08 ? startF - (startF - endF) * (t / 0.08) : endF;
            phase = (phase + f / sampleRate) % 1.0;

            const env = vel * Math.exp(-progress * 6.5);
            let s = Math.sin(2 * Math.PI * phase);
            if (drumKit === "funk-tamborzao") {
              s = 2.0 * Math.abs(2.0 * (phase - Math.floor(phase + 0.5))) - 1.0; // triangle body
            }
            const out = s * env;
            left[sampleIdx] += out;
            right[sampleIdx] += out;
          }
        } else if (ev.instrument === "snare") {
          const durSec = drumKit === "funk-tamborzao" ? 0.1 : 0.14;
          const durSamples = Math.floor(durSec * sampleRate);
          const vel = (currentVel / 127) * 0.38 * effectiveDrumsVol;

          const bpFilter = new BiquadFilter();
          bpFilter.setBandpass(drumKit === "drill-punch" ? 2200 : 1600, 1.4, sampleRate);

          let tPhase = 0;
          for (let n = 0; n < durSamples; n++) {
            const sampleIdx = startSample + n;
            if (sampleIdx >= totalSamples) break;

            const progress = n / durSamples;
            const t = n / sampleRate;

            // Noise snap
            const noise = rng.nextNoise();
            const filteredNoise = bpFilter.process(noise) * vel * Math.exp(-progress * 7.5);

            // Body tone
            const toneFreq = t < 0.07 ? 190 - (190 - 85) * (t / 0.07) : 85;
            tPhase = (tPhase + toneFreq / sampleRate) % 1.0;
            const triangleTone =
              (2.0 * Math.abs(2.0 * (tPhase - Math.floor(tPhase + 0.5))) - 1.0) *
              (vel * 0.7) *
              Math.exp(-progress * 10.0);

            const out = filteredNoise + triangleTone;
            left[sampleIdx] += out;
            right[sampleIdx] += out;
          }
        } else if (ev.instrument === "clap") {
          const vel = (currentVel / 127) * 0.38 * effectiveDrumsVol;
          const offsets = [0, 0.011, 0.022];
          const bpFilter = new BiquadFilter();
          bpFilter.setBandpass(1400, 1.5, sampleRate);

          offsets.forEach((offsetSec, idx) => {
            const burstStart = startSample + Math.floor(offsetSec * sampleRate);
            const isMain = idx === 2;
            const burstDurSec = isMain ? 0.16 : 0.015;
            const burstDurSamples = Math.floor(burstDurSec * sampleRate);
            const burstVel = isMain ? vel : vel * 0.55;

            for (let n = 0; n < burstDurSamples; n++) {
              const sampleIdx = burstStart + n;
              if (sampleIdx >= totalSamples) break;
              const progress = n / burstDurSamples;
              const noise = rng.nextNoise();
              const out = bpFilter.process(noise) * burstVel * Math.exp(-progress * (isMain ? 8.5 : 20.0));
              left[sampleIdx] += out;
              right[sampleIdx] += out;
            }
          });
        } else if (ev.instrument === "open-hat") {
          const durSec = 0.22;
          const durSamples = Math.floor(durSec * sampleRate);
          const vel = (currentVel / 127) * 0.24 * effectiveDrumsVol;
          const inharmonicFreqs = [245, 306, 384, 422, 659, 866];

          const hpFilter = new BiquadFilter();
          hpFilter.setHighpass(6200, 1.2, sampleRate);

          for (let n = 0; n < durSamples; n++) {
            const sampleIdx = startSample + n;
            if (sampleIdx >= totalSamples) break;

            const progress = n / durSamples;
            const t = n / sampleRate;
            let metal = 0;
            for (let f = 0; f < inharmonicFreqs.length; f++) {
              metal += Math.sin(2 * Math.PI * inharmonicFreqs[f] * t) > 0 ? 0.12 : -0.12;
            }
            const rawSig = metal * 0.55 + rng.nextNoise() * 0.45;
            const out = hpFilter.process(rawSig) * vel * Math.exp(-progress * 4.2);
            left[sampleIdx] += out;
            right[sampleIdx] += out;
          }
        } else {
          // Closed Hat with Pitch Cents and Inharmonic Metallic Synthesis
          const durSec = 0.038;
          const durSamples = Math.floor(durSec * sampleRate);
          const vel = (currentVel / 127) * 0.2 * effectiveDrumsVol;
          const inharmonicFreqs = [245, 306, 384, 422, 659, 866];

          const hpFilter = new BiquadFilter();
          let cutoff = 7500;
          if (ev.filterCurve) {
            cutoff = ev.filterCurve.startHz;
          }
          hpFilter.setHighpass(Math.max(1000, cutoff), 1.2, sampleRate);

          // Pitch Rate Shift
          const pitchRate = ev.pitchCents ? Math.pow(2, ev.pitchCents / 1200) : 1.0;

          for (let n = 0; n < durSamples; n++) {
            const sampleIdx = startSample + n;
            if (sampleIdx >= totalSamples) break;

            const progress = n / durSamples;
            const t = n / sampleRate;
            let metal = 0;
            for (let f = 0; f < inharmonicFreqs.length; f++) {
              metal += Math.sin(2 * Math.PI * inharmonicFreqs[f] * t * pitchRate) > 0 ? 0.12 : -0.12;
            }
            const rawSig = metal * 0.65 + rng.nextNoise() * 0.35;
            const out = hpFilter.process(rawSig) * vel * Math.exp(-progress * 14.0);
            left[sampleIdx] += out;
            right[sampleIdx] += out;
          }
        }
      });
    }
  } // End of canonical section loop
} // End of explicit passes

  // --- 4. MASTER BUS (DC Blocker + Soft-Clipper + Peak Limiter) ---
  let dcPrevX_L = 0;
  let dcPrevY_L = 0;
  let dcPrevX_R = 0;
  let dcPrevY_R = 0;

  for (let i = 0; i < totalSamples; i++) {
    // DC Blocker (R = MASTER_BUS_CONFIG.dcBlockerR)
    const xL = left[i];
    const yL = xL - dcPrevX_L + MASTER_BUS_CONFIG.dcBlockerR * dcPrevY_L;
    dcPrevX_L = xL;
    dcPrevY_L = yL;

    const xR = right[i];
    const yR = xR - dcPrevX_R + MASTER_BUS_CONFIG.dcBlockerR * dcPrevY_R;
    dcPrevX_R = xR;
    dcPrevY_R = yR;

    // 1. Soft-Clipper Stage (Smooth analog saturation threshold)
    const peak = Math.max(Math.abs(yL), Math.abs(yR));
    let softGain = 1.0;
    const threshold = MASTER_BUS_CONFIG.softClipThreshold;
    if (peak > threshold) {
      softGain = threshold + (peak - threshold) / (1 + (peak - threshold) * 2.0);
      softGain /= peak;
    }

    let outL = yL * softGain;
    let outR = yR * softGain;

    // 2. True Peak Limiter (Hard ceiling at -1.0 dBFS / peakCeiling)
    const ceiling = MASTER_BUS_CONFIG.peakCeiling;
    const postPeak = Math.max(Math.abs(outL), Math.abs(outR));
    if (postPeak > ceiling) {
      const limitScale = ceiling / postPeak;
      outL *= limitScale;
      outR *= limitScale;
    }

    left[i] = outL;
    right[i] = outR;
  }

  return {
    left,
    right,
    sampleRate,
    timeline,
    timelineHash: timeline.timelineHash,
    durationSeconds: totalSamples / sampleRate,
  };
}
