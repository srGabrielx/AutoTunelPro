import type {
  BassDrive,
  BassResult,
  DrumHit,
  DrumKitMode,
  DrumResult,
  DrumRoll,
  MelodyLayer,
  MelodySynthType,
} from "./types";

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
  drumHits: Array<{
    drum: DrumHit["drum"];
    velocity: number;
    kit: DrumKitMode;
    roll?: DrumRoll;
    microTimingMs?: number;
  }>;
}

export class SampleAccurateAudioEngine {
  private ctx: AudioContext | null = null;
  private delayNode: DelayNode | null = null;
  private delayGain: GainNode | null = null;
  private masterGain: GainNode | null = null;

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

  // Active scheduled nodes for instant cleanup
  private activeNodes: Array<{ stop: (time: number) => void }> = [];

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

    // Snare noise buffer (0.15s)
    const snareSamples = Math.ceil(sampleRate * 0.15);
    this.snareNoiseBuffer = ctx.createBuffer(1, snareSamples, sampleRate);
    const sData = this.snareNoiseBuffer.getChannelData(0);
    for (let i = 0; i < snareSamples; i++) sData[i] = Math.random() * 2 - 1;

    // Hat noise buffer (0.05s)
    const hatSamples = Math.ceil(sampleRate * 0.05);
    this.hatNoiseBuffer = ctx.createBuffer(1, hatSamples, sampleRate);
    const hData = this.hatNoiseBuffer.getChannelData(0);
    for (let i = 0; i < hatSamples; i++) hData[i] = Math.random() * 2 - 1;

    // Open-hat noise buffer (0.25s)
    const ohSamples = Math.ceil(sampleRate * 0.25);
    this.openHatNoiseBuffer = ctx.createBuffer(1, ohSamples, sampleRate);
    const ohData = this.openHatNoiseBuffer.getChannelData(0);
    for (let i = 0; i < ohSamples; i++) ohData[i] = Math.random() * 2 - 1;
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
    gain.connect(this.masterGain || ctx.destination);
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
   * Duck 808 sub-bass briefly when kick triggers (Sidechain Compression).
   */
  public duck808(when: number) {
    const bassGain = this.trackGainNodes.get("bass");
    if (!bassGain || !this.ctx) return;
    const currentVol = this.trackVolumes.get("bass") ?? 0.8;
    const duckedVol = currentVol * 0.32;
    try {
      bassGain.gain.setValueAtTime(currentVol, when);
      bassGain.gain.linearRampToValueAtTime(duckedVol, when + 0.006); // 6ms attack
      bassGain.gain.linearRampToValueAtTime(currentVol, when + 0.075); // 75ms release
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
    const events: ScheduledStepEvent[] = Array.from({ length: 16 }, (_, step) => ({
      step,
      melodyNotes: [],
      drumHits: [],
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

    // Index Drums
    if (drums && !muteDrums) {
      drums.hits.forEach((hit) => {
        if (hit.step >= 0 && hit.step < 16) {
          events[hit.step].drumHits.push({
            drum: hit.drum,
            velocity: hit.velocity,
            kit: drumKit,
            roll: hit.roll,
            microTimingMs: hit.microTimingMs,
          });
        }
      });
    }

    this.indexedEvents = events;
  }

  /**
   * Update BPM or musical events live on the fly without cutting playback.
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
    if (bpm !== undefined) {
      this.bpm = Math.max(40, Math.min(300, bpm || 140));
    }
    if (melodyLayers !== undefined || bass !== undefined || drums !== undefined) {
      this.prepareStepEvents({
        melodyLayers: melodyLayers ?? [],
        bass: bass ?? null,
        drums: drums ?? null,
        muteBass: muteBass ?? false,
        muteDrums: muteDrums ?? false,
        bassDrive: bassDrive ?? "warm",
        drumKit: drumKit ?? "trap-808",
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
  }) {
    this.stop();

    const ctx = this.init();
    this.bpm = Math.max(40, Math.min(300, bpm || 140));
    this.isLooping = isLooping;
    this.playbackMode = playbackMode;
    this.onStopCallback = onStop;

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

    // 3. Drums with Sub-Step Rolls, Parametric Pitch Curves, Micro-Timing & Sidechain
    if (this.playbackMode === "all" || this.playbackMode === "drums") {
      for (let i = 0; i < event.drumHits.length; i++) {
        const d = event.drumHits[i];
        const offset = (d.microTimingMs || 0) / 1000;
        const hitTime = Math.max(when, when + offset);

        // Sidechain kick to 808 ducking
        if (d.drum === "kick" && this.playbackMode === "all") {
          this.duck808(hitTime);
        }

        if (d.roll && d.roll.count > 1) {
          const subCount = d.roll.count;
          const subInterval = stepDuration / subCount;
          const pitchCurve = d.roll.pitchCurve;

          for (let s = 0; s < subCount; s++) {
            const subTime = hitTime + s * subInterval;
            let velScale = 1.0;
            if (d.roll.velocityCurve === "crescendo") {
              velScale = 0.55 + 0.45 * (s / (subCount - 1 || 1));
            } else if (d.roll.velocityCurve === "decrescendo") {
              velScale = 1.0 - 0.45 * (s / (subCount - 1 || 1));
            }
            const subVel = Math.max(25, Math.min(127, Math.round(d.velocity * velScale)));

            if (d.drum === "hat") {
              let startF = 7500;
              let endF = 7500;
              if (pitchCurve) {
                startF = 7500 * Math.pow(2, pitchCurve.startCents / 1200);
                endF = 7500 * Math.pow(2, pitchCurve.endCents / 1200);
              }
              this.playHat(subTime, subVel, startF, subInterval * 0.82, endF);
            } else if (d.drum === "snare") {
              this.playSnare(subTime, subVel, d.kit);
            } else if (d.drum === "kick") {
              this.playKick(subTime, subVel, d.kit);
            } else {
              this.playOpenHat(subTime, subVel);
            }
          }
        } else {
          if (d.drum === "kick") this.playKick(hitTime, d.velocity, d.kit);
          else if (d.drum === "snare") this.playSnare(hitTime, d.velocity, d.kit);
          else if (d.drum === "open-hat") this.playOpenHat(hitTime, d.velocity);
          else this.playHat(hitTime, d.velocity);
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
    filterFreq = 7500,
    dur = 0.038,
    pitchEndFreq?: number
  ) {
    if (!this.ctx || !this.hatNoiseBuffer) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.hatNoiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(filterFreq, when);
    if (pitchEndFreq && pitchEndFreq !== filterFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(1000, pitchEndFreq), when + dur);
    }

    const trackGain = this.getOrCreateTrackGain("drums");
    const gain = this.ctx.createGain();
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

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const dist = this.ctx.createWaveShaper();

    if (drive === "overdrive" && this.distOverdriveCurve) {
      dist.curve = this.distOverdriveCurve as Float32Array<ArrayBuffer>;
    } else if (drive === "warm" && this.distWarmCurve) {
      dist.curve = this.distWarmCurve as Float32Array<ArrayBuffer>;
    } else {
      dist.curve = null;
    }

    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.5, when);
    osc.frequency.exponentialRampToValueAtTime(freq, when + 0.05);

    if (isSlide) {
      osc.frequency.exponentialRampToValueAtTime(freq * 1.45, when + durationSec * 0.75);
    }

    const trackGain = this.getOrCreateTrackGain("bass");
    gain.gain.setValueAtTime(vol, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSec);

    osc.connect(dist).connect(gain).connect(trackGain);
    osc.start(when);
    osc.stop(when + durationSec + 0.05);

    this.trackNode(osc);
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
    const vol = (velocity / 127) * (synthType === "pad" ? 0.28 : 0.22) * volScale;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = synthType === "pad" ? "triangle" : synthType === "arp" ? "sawtooth" : "sawtooth";
    osc1.frequency.setValueAtTime(freq, when);

    osc2.type = synthType === "pluck" ? "sine" : "triangle";
    osc2.frequency.setValueAtTime(freq * 1.003, when);

    filter.type = "lowpass";
    const cutoff = synthType === "pad" ? 1800 : synthType === "pluck" ? 4200 : synthType === "arp" ? 3600 : 3000;
    filter.frequency.setValueAtTime(cutoff, when);
    filter.frequency.exponentialRampToValueAtTime(450, when + durationSec * 0.9);
    filter.Q.value = synthType === "pluck" ? 5.0 : 3.2;

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

  private trackNode(node: { stop: (time: number) => void }) {
    this.activeNodes.push(node);
    if (this.activeNodes.length > 200) {
      this.activeNodes = this.activeNodes.slice(-100);
    }
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
      for (let i = 0; i < this.activeNodes.length; i++) {
        try {
          this.activeNodes[i].stop(now);
        } catch {
          // Ignore already stopped nodes
        }
      }
    }
    this.activeNodes = [];
    this.nextAbsoluteStep = 0;
  }
}
