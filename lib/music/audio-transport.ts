import { buildGrooveEventPlan, type GrooveEvent } from "./groove-plan.ts";
import {
  BASS_808_CONFIGS,
  DRUM_KIT_SYNTH_CONFIGS,
  getMelodySynthConfig,
  MASTER_BUS_CONFIG,
} from "./synthesis-presets.ts";
import type {
  BassDrive,
  BassResult,
  DrumKitMode,
  DrumResult,
  MelodyLayer,
  MelodySynthType,
} from "./types.ts";

export type PlaybackMode = "all" | "melody" | "bass" | "drums";

export interface ScheduledStepEvent {
  step: number;
  melodyNotes: Array<{
    layerId: string;
    note: number;
    duration: number;
    velocity: number;
    synthType: MelodySynthType;
    volScale: number;
  }>;
  bassNote?: {
    note: number;
    duration: number;
    velocity: number;
    slide?: boolean;
    drive: BassDrive;
  };
  grooveEvents: GrooveEvent[];
  drumKit: DrumKitMode;
}

export class SampleAccurateAudioEngine {
  private ctx: AudioContext | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private bassSidechainGain: GainNode | null = null;

  // Per-track persistent GainNodes
  private trackGainNodes: Map<string, GainNode> = new Map();
  private trackVolumes: Map<string, number> = new Map();

  // Pre-allocated noise buffers per AudioContext
  private snareNoiseBuffer: AudioBuffer | null = null;
  private hatNoiseBuffer: AudioBuffer | null = null;
  private openHatNoiseBuffer: AudioBuffer | null = null;

  // Waveshaper distortion curves
  private distWarmCurve: Float32Array | null = null;
  private distOverdriveCurve: Float32Array | null = null;

  // Active scheduled nodes for instant cleanup (using Set to avoid unbounded array growth or orphan nodes)
  private activeNodes: Set<{ stop: (time: number) => void; onended: ((this: AudioScheduledSourceNode, ev: Event) => any) | null }> = new Set();

  // Transport state
  private isPlaying = false;
  private transportStartTime = 0;
  private nextAbsoluteStep = 0;
  private bpm = 140;
  private isLooping = true;
  private playbackMode: PlaybackMode = "all";
  private wakeTimer: NodeJS.Timeout | number | null = null;

  // Pre-indexed step event map (steps 0..15)
  private indexedEvents: ScheduledStepEvent[] = [];

  // Callbacks
  private onStopCallback?: () => void;
  private onLoopCompleteCallback?: () => void;

  public init(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);

      // Bass Dedicated Sidechain Gain (Between Bass TrackGain and MasterGain)
      this.bassSidechainGain = this.ctx.createGain();
      this.bassSidechainGain.gain.value = 1.0;
      this.bassSidechainGain.connect(this.masterGain);

      // Delay Bus
      this.delayNode = this.ctx.createDelay();
      this.delayNode.delayTime.value = 0.24;
      this.delayGain = this.ctx.createGain();
      this.delayGain.gain.value = 0.22;
      this.delayNode.connect(this.delayGain);
      this.delayGain.connect(this.delayNode);
      this.delayGain.connect(this.masterGain);

      // Pre-allocate Noise Buffers
      this.initNoiseBuffers(this.ctx);

      // Pre-allocate WaveShaper Curves
      this.initDistortionCurves();
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private initNoiseBuffers(ctx: AudioContext) {
    const sampleRate = ctx.sampleRate;

    // Deterministic PRNG matching dsp-renderer.ts SeededRandom(777)
    // Ensures noise buffers are identical across AudioContext re-initializations
    let noiseSeed = 777;
    const nextNoise = (): number => {
      noiseSeed = (1664525 * noiseSeed + 1013904223) % 4294967296;
      return (noiseSeed / 4294967296) * 2.0 - 1.0;
    };

    // Snare noise buffer (0.15s)
    const snareSamples = Math.ceil(sampleRate * 0.15);
    this.snareNoiseBuffer = ctx.createBuffer(1, snareSamples, sampleRate);
    const sData = this.snareNoiseBuffer.getChannelData(0);
    for (let i = 0; i < snareSamples; i++) sData[i] = nextNoise();

    // Inharmonic Metallic Hat Buffer (Analogue Roland TR-808/909 Modeling)
    const inharmonicFreqs = [245, 306, 384, 422, 659, 866];

    // Closed Hat noise buffer (0.05s)
    const hatSamples = Math.ceil(sampleRate * 0.05);
    this.hatNoiseBuffer = ctx.createBuffer(1, hatSamples, sampleRate);
    const hData = this.hatNoiseBuffer.getChannelData(0);
    for (let i = 0; i < hatSamples; i++) {
      const t = i / sampleRate;
      let metal = 0;
      for (let f = 0; f < inharmonicFreqs.length; f++) {
        metal += Math.sin(2 * Math.PI * inharmonicFreqs[f] * t) > 0 ? 0.12 : -0.12;
      }
      const noise = nextNoise();
      hData[i] = metal * 0.65 + noise * 0.35;
    }

    // Open-hat noise buffer (0.25s)
    const ohSamples = Math.ceil(sampleRate * 0.25);
    this.openHatNoiseBuffer = ctx.createBuffer(1, ohSamples, sampleRate);
    const ohData = this.openHatNoiseBuffer.getChannelData(0);
    for (let i = 0; i < ohSamples; i++) {
      const t = i / sampleRate;
      let metal = 0;
      for (let f = 0; f < inharmonicFreqs.length; f++) {
        metal += Math.sin(2 * Math.PI * inharmonicFreqs[f] * t) > 0 ? 0.12 : -0.12;
      }
      const noise = nextNoise();
      ohData[i] = metal * 0.55 + noise * 0.45;
    }
  }

  private initDistortionCurves() {
    const kWarm = 2;
    const kOverdrive = 8;
    this.distWarmCurve = new Float32Array(128);
    this.distOverdriveCurve = new Float32Array(128);

    for (let i = 0; i < 128; i++) {
      const x = (i * 2) / 128 - 1;
      this.distWarmCurve[i] = ((Math.PI + kWarm) * x) / (Math.PI + kWarm * Math.abs(x));
      this.distOverdriveCurve[i] = ((Math.PI + kOverdrive) * x) / (Math.PI + kOverdrive * Math.abs(x));
    }
  }

  public getContext(): AudioContext {
    return this.init();
  }

  /**
   * Get or create a persistent GainNode for a specific track ID.
   */
  public getOrCreateTrackGain(trackId: string): GainNode {
    const existing = this.trackGainNodes.get(trackId);
    if (existing) return existing;

    const ctx = this.init();
    const gain = ctx.createGain();
    gain.gain.value = 0.8; // default 80%

    // 808 Bass connects through bassSidechainGain; others connect to masterGain
    if (trackId === "bass" && this.bassSidechainGain) {
      gain.connect(this.bassSidechainGain);
    } else {
      gain.connect(this.masterGain || ctx.destination);
    }

    this.trackGainNodes.set(trackId, gain);
    return gain;
  }

  /**
   * Smoothly set volume for a track without pops/clicks.
   */
  public setTrackVolume(trackId: string, volume: number) {
    const gain = this.getOrCreateTrackGain(trackId);
    this.trackVolumes.set(trackId, volume);
    if (!this.ctx) return;
    gain.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.ctx.currentTime,
      0.015
    );
  }

  /**
   * Duck 808 sub-bass via dedicated Sidechain GainNode when kick triggers.
   */
  public triggerSidechainDucking(when: number) {
    if (!this.ctx || !this.bassSidechainGain) return;
    const gainParam = this.bassSidechainGain.gain;
    const attackSec = 0.005;  // 5ms attack
    const releaseSec = 0.075; // 75ms release
    const duckTarget = 0.32;
    const baseline = 1.0;

    try {
      if (typeof (gainParam as unknown as { cancelAndHoldAtTime?: (t: number) => void }).cancelAndHoldAtTime === "function") {
        (gainParam as unknown as { cancelAndHoldAtTime: (t: number) => void }).cancelAndHoldAtTime(when);
      } else {
        gainParam.cancelScheduledValues(when);
        gainParam.setValueAtTime(baseline, when);
      }
      gainParam.setValueAtTime(baseline, when);
      gainParam.linearRampToValueAtTime(duckTarget, when + attackSec);
      gainParam.linearRampToValueAtTime(baseline, when + attackSec + releaseSec);
    } catch {}
  }

  /**
   * Mute/unmute a track by setting gain to 0 or restoring volume.
   */
  public setTrackMuted(trackId: string, muted: boolean, savedVolume: number) {
    const gain = this.getOrCreateTrackGain(trackId);
    if (!this.ctx) return;
    gain.gain.setTargetAtTime(
      muted ? 0 : Math.max(0, Math.min(1, savedVolume)),
      this.ctx.currentTime,
      0.015
    );
  }

  /**
   * Remove and disconnect a track's GainNode.
   */
  public removeTrackGain(trackId: string) {
    const gain = this.trackGainNodes.get(trackId);
    if (gain) {
      try { gain.disconnect(); } catch {}
      this.trackGainNodes.delete(trackId);
    }
  }

  /**
   * Get the output node for a track (its GainNode).
   */
  public getTrackOutput(trackId: string): AudioNode {
    return this.getOrCreateTrackGain(trackId);
  }

  public getTransportStartTime(): number {
    return this.transportStartTime;
  }

  public getStepDuration(): number {
    return 60 / this.bpm / 4;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  // Last passed parameters for instant dynamic live updates
  private lastParams: {
    melodyLayers: MelodyLayer[];
    bass: BassResult | null;
    drums: DrumResult | null;
    muteBass: boolean;
    muteDrums: boolean;
    bassDrive: BassDrive;
    drumKit: DrumKitMode;
  } = {
    melodyLayers: [],
    bass: null,
    drums: null,
    muteBass: false,
    muteDrums: false,
    bassDrive: "warm",
    drumKit: "trap-808",
  };

  /**
   * Pre-indexes all musical events for 16 steps into dense array structures.
   * This ensures ZERO .find() or .filter() allocations during audio scheduler ticks.
   */
  public prepareStepEvents({
    melodyLayers,
    bass,
    drums,
    muteBass,
    muteDrums,
    bassDrive,
    drumKit,
  }: {
    melodyLayers: MelodyLayer[];
    bass: BassResult | null;
    drums: DrumResult | null;
    muteBass: boolean;
    muteDrums: boolean;
    bassDrive: BassDrive;
    drumKit: DrumKitMode;
  }) {
    this.lastParams = {
      melodyLayers,
      bass,
      drums,
      muteBass,
      muteDrums,
      bassDrive,
      drumKit,
    };

    const events: ScheduledStepEvent[] = Array.from({ length: 16 }, (_, step) => ({
      step,
      melodyNotes: [],
      grooveEvents: [],
      drumKit,
    }));

    // Index Melody Layers
    const activeLayers = (melodyLayers ?? []).filter(
      (l) => !l.muted && l.result && l.result.notes.length > 0
    );
    const volScale = activeLayers.length > 1 ? 0.75 / activeLayers.length : 1.0;

    activeLayers.forEach((layer) => {
      layer.result!.notes.forEach((n) => {
        if (n.step >= 0 && n.step < 16) {
          events[n.step].melodyNotes.push({
            layerId: layer.id,
            note: n.note,
            duration: n.duration || 1,
            velocity: n.velocity,
            synthType: layer.synthType,
            volScale,
          });
        }
      });
    });

    // Index 808 Bass
    if (bass && !muteBass) {
      bass.notes.forEach((bNote) => {
        if (bNote.step >= 0 && bNote.step < 16) {
          events[bNote.step].bassNote = {
            note: bNote.note,
            duration: bNote.duration || 2,
            velocity: bNote.velocity,
            slide: bNote.slide,
            drive: bassDrive,
          };
        }
      });
    }

    // Index Drums via Single Source of Truth Groove Plan
    if (drums && !muteDrums && drums.hits.length > 0) {
      const plan = buildGrooveEventPlan({
        hits: drums.hits,
        bpm: this.bpm,
        patternDurationSteps: 16,
      });

      for (let i = 0; i < plan.length; i++) {
        const ev = plan[i];
        if (ev.step >= 0 && ev.step < 16) {
          events[ev.step].grooveEvents.push(ev);
        }
      }
    }

    this.indexedEvents = events;
  }

  /**
   * Update BPM or musical events live on the fly without cutting playback or stalling.
   * Smoothly transitions the audio clock and preserves current playback phase.
   */
  public updateLiveParams({
    bpm,
    melodyLayers,
    bass,
    drums,
    muteBass,
    muteDrums,
    bassDrive,
    drumKit,
  }: {
    bpm?: number;
    melodyLayers?: MelodyLayer[];
    bass?: BassResult | null;
    drums?: DrumResult | null;
    muteBass?: boolean;
    muteDrums?: boolean;
    bassDrive?: BassDrive;
    drumKit?: DrumKitMode;
  }) {
    let bpmChanged = false;
    if (bpm !== undefined) {
      const sanitizedBpm = Math.max(40, Math.min(300, bpm || 140));
      if (sanitizedBpm !== this.bpm) {
        if (this.isPlaying && this.ctx) {
          const oldStepDuration = 60 / this.bpm / 4;
          const newStepDuration = 60 / sanitizedBpm / 4;
          const now = this.ctx.currentTime;

          // Seamless phase calculation: preserve continuous position in current compass
          const elapsedSec = Math.max(0, now - this.transportStartTime);
          const continuousStep = elapsedSec / oldStepDuration;

          // Re-anchor transportStartTime so that step progression continues smoothly from 'now'
          this.transportStartTime = now - continuousStep * newStepDuration;

          // Next step to schedule is the immediate upcoming step after current time
          this.nextAbsoluteStep = Math.floor(continuousStep) + 1;
        }
        this.bpm = sanitizedBpm;
        bpmChanged = true;
      }
    }

    if (
      bpmChanged ||
      melodyLayers !== undefined ||
      bass !== undefined ||
      drums !== undefined ||
      muteBass !== undefined ||
      muteDrums !== undefined ||
      bassDrive !== undefined ||
      drumKit !== undefined
    ) {
      this.prepareStepEvents({
        melodyLayers: melodyLayers ?? this.lastParams.melodyLayers,
        bass: bass !== undefined ? bass : this.lastParams.bass,
        drums: drums !== undefined ? drums : this.lastParams.drums,
        muteBass: muteBass ?? this.lastParams.muteBass,
        muteDrums: muteDrums ?? this.lastParams.muteDrums,
        bassDrive: bassDrive ?? this.lastParams.bassDrive,
        drumKit: drumKit ?? this.lastParams.drumKit,
      });
    }
  }

  /**
   * Start sample-accurate lookahead playback.
   */
  public start({
    bpm,
    isLooping,
    playbackMode,
    melodyLayers,
    bass,
    drums,
    muteBass,
    muteDrums,
    bassDrive,
    drumKit,
    onStop,
    onLoopComplete,
  }: {
    bpm: number;
    isLooping: boolean;
    playbackMode: PlaybackMode;
    melodyLayers: MelodyLayer[];
    bass: BassResult | null;
    drums: DrumResult | null;
    muteBass: boolean;
    muteDrums: boolean;
    bassDrive: BassDrive;
    drumKit: DrumKitMode;
    onStop?: () => void;
    onLoopComplete?: () => void;
  }) {
    this.stop();

    const ctx = this.init();
    this.bpm = Math.max(40, Math.min(300, bpm || 140));
    this.isLooping = isLooping;
    this.playbackMode = playbackMode;
    this.onStopCallback = onStop;
    this.onLoopCompleteCallback = onLoopComplete;

    this.prepareStepEvents({
      melodyLayers,
      bass,
      drums,
      muteBass,
      muteDrums,
      bassDrive,
      drumKit,
    });

    // Schedule slightly ahead of currentTime to ensure perfect start
    this.transportStartTime = ctx.currentTime + 0.05;
    this.nextAbsoluteStep = 0;
    this.isPlaying = true;

    // Run initial scheduler tick immediately
    this.scheduleTick();

    // Wake-up interval: 25ms
    this.wakeTimer = setInterval(() => {
      this.scheduleTick();
    }, 25);
  }

  /**
   * Look-ahead scheduler tick.
   * Schedules all steps within [currentTime, currentTime + 0.12s].
   */
  private scheduleTick() {
    if (!this.isPlaying || !this.ctx) return;

    const stepDuration = 60 / this.bpm / 4;
    const scheduleAheadTime = 0.12; // 120ms lookahead
    const currentTime = this.ctx.currentTime;

    while (this.isPlaying) {
      // ABSOLUTE CALCULATION: zero drift
      const scheduledTime = this.transportStartTime + this.nextAbsoluteStep * stepDuration;

      // Protection: if scheduledTime is far behind current time (e.g. lag spike), skip to avoid audio burst
      if (scheduledTime < currentTime - 0.05) {
        this.nextAbsoluteStep++;
        continue;
      }

      if (scheduledTime >= currentTime + scheduleAheadTime) {
        break; // Beyond lookahead window
      }

      const patternStep = this.nextAbsoluteStep % 16;

      // Stop condition if looping is false and reached step 16
      if (this.nextAbsoluteStep >= 16 && !this.isLooping) {
        this.stop();
        if (this.onStopCallback) {
          this.onStopCallback();
        }
        return;
      }

      // Trigger loop complete callback BEFORE scheduling the first step of the new loop
      if (patternStep === 0 && this.nextAbsoluteStep > 0 && this.isLooping) {
        if (this.onLoopCompleteCallback) {
          this.onLoopCompleteCallback();
        }
      }

      this.scheduleStepEvents(patternStep, scheduledTime, stepDuration);
      this.nextAbsoluteStep++;
    }
  }

  private scheduleStepEvents(patternStep: number, when: number, stepDuration: number) {
    const event = this.indexedEvents[patternStep];
    if (!event) return;

    // 1. Melody Notes
    if (this.playbackMode === "all" || this.playbackMode === "melody") {
      for (let i = 0; i < event.melodyNotes.length; i++) {
        const m = event.melodyNotes[i];
        this.playMelodyNote(
          m.layerId,
          when,
          m.note,
          stepDuration * m.duration * 0.95,
          m.velocity,
          m.synthType,
          m.volScale
        );
      }
    }

    // 2. 808 Bass Note
    if ((this.playbackMode === "all" || this.playbackMode === "bass") && event.bassNote) {
      const b = event.bassNote;
      this.play808Bass(
        when,
        b.note,
        stepDuration * b.duration * 0.98,
        b.velocity,
        b.slide,
        b.drive
      );
    }

    // 3. Drums with Pre-Calculated Groove Event Plan (Zero Runtime Calculations)
    if (this.playbackMode === "all" || this.playbackMode === "drums") {
      for (let i = 0; i < event.grooveEvents.length; i++) {
        const ev = event.grooveEvents[i];
        const stepOffsetSec = ev.timeSeconds - (event.step * stepDuration);
        const hitTime = Math.max(when, when + stepOffsetSec);

        if (ev.instrument === "kick") {
          this.triggerSidechainDucking(hitTime);
          this.playKick(hitTime, ev.velocity, event.drumKit);
        } else if (ev.instrument === "clap") {
          this.playClap(hitTime, ev.velocity);
        } else if (ev.instrument === "snare") {
          this.playSnare(hitTime, ev.velocity, event.drumKit);
        } else if (ev.instrument === "open-hat") {
          this.playOpenHat(hitTime, ev.velocity);
        } else {
          this.playHat(hitTime, ev.velocity, ev.pitchCents, ev.filterCurve);
        }
      }
    }
  }

  // --- AUDIO SYNTHESIS NODES WITH ACTIVE TRACKING ---

  private playKick(when: number, velocity = 90, kit: DrumKitMode = "trap-808") {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const vol = (velocity / 127) * (kit === "funk-tamborzao" ? 0.55 : 0.45);
    const startFreq = kit === "drill-punch" ? 180 : kit === "funk-tamborzao" ? 140 : 155;
    const endFreq = kit === "funk-tamborzao" ? 52 : 44;

    osc.type = kit === "funk-tamborzao" ? "triangle" : "sine";
    osc.frequency.setValueAtTime(startFreq, when);
    osc.frequency.exponentialRampToValueAtTime(endFreq, when + 0.08);

    const trackGain = this.getOrCreateTrackGain("drums");
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.32);

    osc.connect(gain).connect(trackGain);
    osc.start(when);
    osc.stop(when + 0.33);

    this.trackNode(osc);
  }

  private playClap(when: number, velocity = 92) {
    if (!this.ctx || !this.snareNoiseBuffer) return;
    const trackGain = this.getOrCreateTrackGain("drums");
    const vol = (velocity / 127) * 0.38;

    const burstOffsets = [0, 0.011, 0.022];
    burstOffsets.forEach((offset, idx) => {
      if (!this.ctx || !this.snareNoiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.snareNoiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 1.5;

      const gain = this.ctx.createGain();
      const burstVol = idx === 2 ? vol : vol * 0.55;
      gain.gain.setValueAtTime(burstVol, when + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, when + offset + (idx === 2 ? 0.16 : 0.015));

      noise.connect(filter).connect(gain).connect(trackGain);
      noise.start(when + offset);
      noise.stop(when + offset + (idx === 2 ? 0.17 : 0.016));
      this.trackNode(noise);
    });
  }

  private playSnare(when: number, velocity = 90, kit: DrumKitMode = "trap-808") {
    if (!this.ctx) return;
    const vol = (velocity / 127) * 0.36;
    const dur = kit === "funk-tamborzao" ? 0.09 : 0.13;

    if (this.snareNoiseBuffer) {
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.snareNoiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = kit === "drill-punch" ? 2200 : 1600;
      filter.Q.value = 1.2;

      const trackGain = this.getOrCreateTrackGain("drums");
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, when);
      gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

      noise.connect(filter).connect(gain).connect(trackGain);
      noise.start(when);
      noise.stop(when + dur);
      this.trackNode(noise);
    }

    // Body tone
    const osc = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, when);
    osc.frequency.exponentialRampToValueAtTime(85, when + 0.07);

    const trackGain = this.getOrCreateTrackGain("drums");
    tGain.gain.setValueAtTime(vol * 0.75, when);
    tGain.gain.exponentialRampToValueAtTime(0.001, when + 0.08);

    osc.connect(tGain).connect(trackGain);
    osc.start(when);
    osc.stop(when + 0.09);
    this.trackNode(osc);
  }

  private playHat(
    when: number,
    velocity = 75,
    pitchCents?: number,
    filterCurve?: { startHz: number; endHz: number; durationMs: number }
  ) {
    if (!this.ctx || !this.hatNoiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hatNoiseBuffer;

    if (pitchCents !== undefined && pitchCents !== 0) {
      try {
        noise.playbackRate.setValueAtTime(Math.pow(2, pitchCents / 1200), when);
      } catch {}
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    if (filterCurve) {
      filter.frequency.setValueAtTime(filterCurve.startHz, when);
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(100, filterCurve.endHz),
        when + filterCurve.durationMs / 1000
      );
    } else {
      filter.frequency.setValueAtTime(7500, when);
    }

    const trackGain = this.getOrCreateTrackGain("drums");
    const gain = this.ctx.createGain();
    const dur = 0.038;
    gain.gain.setValueAtTime((velocity / 127) * 0.18, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter).connect(gain).connect(trackGain);
    noise.start(when);
    noise.stop(when + dur);
    this.trackNode(noise);
  }

  private playOpenHat(when: number, velocity = 80) {
    if (!this.ctx || !this.openHatNoiseBuffer) return;
    const dur = 0.22;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.openHatNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6200;

    const trackGain = this.getOrCreateTrackGain("drums");
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime((velocity / 127) * 0.22, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);

    noise.connect(filter).connect(gain).connect(trackGain);
    noise.start(when);
    noise.stop(when + dur);
    this.trackNode(noise);
  }

  private play808Bass(
    when: number,
    midiNote: number,
    durationSec: number,
    velocity = 100,
    isSlide = false,
    drive: BassDrive = "warm"
  ) {
    if (!this.ctx) return;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const vol = (velocity / 127) * 0.48;
    const cfg = BASS_808_CONFIGS[drive] || BASS_808_CONFIGS.warm;

    const trackGain = this.getOrCreateTrackGain("bass");

    // 1. Clean Sub Oscillator (Preserves pure fundamental for physical subwoofers)
    const cleanOsc = this.ctx.createOscillator();
    const cleanGain = this.ctx.createGain();
    cleanOsc.type = "sine";
    cleanOsc.frequency.setValueAtTime(freq * cfg.pitchDiveStartMultiplier, when);
    cleanOsc.frequency.exponentialRampToValueAtTime(freq, when + cfg.pitchDiveDurationSec);

    // 2. Parallel Saturated Oscillator (Upper harmonics for mobile speaker clarity)
    const satOsc = this.ctx.createOscillator();
    const satGain = this.ctx.createGain();
    const satDist = this.ctx.createWaveShaper();
    satOsc.type = "sine";
    satOsc.frequency.setValueAtTime(freq * cfg.pitchDiveStartMultiplier, when);
    satOsc.frequency.exponentialRampToValueAtTime(freq, when + cfg.pitchDiveDurationSec);

    if (drive === "overdrive" && this.distOverdriveCurve) {
      satDist.curve = this.distOverdriveCurve as Float32Array<ArrayBuffer>;
    } else if (drive === "warm" && this.distWarmCurve) {
      satDist.curve = this.distWarmCurve as Float32Array<ArrayBuffer>;
    } else {
      satDist.curve = null;
    }

    if (isSlide) {
      cleanOsc.frequency.exponentialRampToValueAtTime(freq * 1.45, when + durationSec * 0.75);
      satOsc.frequency.exponentialRampToValueAtTime(freq * 1.45, when + durationSec * 0.75);
    }

    // Parallel Gain Envelopes
    cleanGain.gain.setValueAtTime(vol * cfg.cleanSubGain, when);
    cleanGain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    satGain.gain.setValueAtTime(vol * cfg.parallelSatGain, when);
    satGain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    cleanOsc.connect(cleanGain).connect(trackGain);
    satOsc.connect(satDist).connect(satGain).connect(trackGain);

    cleanOsc.start(when);
    satOsc.start(when);
    cleanOsc.stop(when + durationSec + 0.05);
    satOsc.stop(when + durationSec + 0.05);

    this.trackNode(cleanOsc);
    this.trackNode(satOsc);
  }

  private playMelodyNote(
    layerId: string,
    when: number,
    midiNote: number,
    durationSec: number,
    velocity = 90,
    synthType: MelodySynthType = "lead",
    volScale = 1.0
  ) {
    if (!this.ctx) return;
    const trackGain = this.getOrCreateTrackGain(layerId);
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
    const cfg = getMelodySynthConfig(synthType);
    const vol = (velocity / 127) * cfg.baseVol * cfg.gainCompensation * volScale;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = cfg.osc1Type;
    osc1.frequency.setValueAtTime(freq * Math.pow(2, -cfg.detuneCents / 1200), when);

    osc2.type = cfg.osc2Type;
    osc2.frequency.setValueAtTime(freq * Math.pow(2, cfg.detuneCents / 1200), when);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(cfg.filterStartCutoff, when);
    filter.frequency.exponentialRampToValueAtTime(cfg.filterEndCutoff, when + durationSec * 0.92);
    filter.Q.value = cfg.filterQ;

    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.001, when + durationSec);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(trackGain);

    if (this.delayNode) gain.connect(this.delayNode);

    osc1.start(when);
    osc2.start(when);
    osc1.stop(when + durationSec + 0.05);
    osc2.stop(when + durationSec + 0.05);

    this.trackNode(osc1);
    this.trackNode(osc2);
  }

  private trackNode(node: AudioScheduledSourceNode) {
    this.activeNodes.add(node);
    node.onended = () => {
      this.activeNodes.delete(node);
    };
  }

  /**
   * Immediately stops playback, cancels wake timer, and terminates all active audio nodes.
   */
  public stop() {
    this.isPlaying = false;
    if (this.wakeTimer) {
      clearInterval(this.wakeTimer);
      this.wakeTimer = null;
    }

    if (this.ctx && this.ctx.state !== "closed") {
      const now = this.ctx.currentTime;
      for (const node of this.activeNodes) {
        try {
          node.stop(now);
          // Disconnect as a safety measure for faster garbage collection
          if ('disconnect' in node && typeof node.disconnect === 'function') {
             (node as any).disconnect();
          }
        } catch {
          // Ignore already stopped nodes
        }
      }
    }
    this.activeNodes.clear();
    this.nextAbsoluteStep = 0;
  }
}
