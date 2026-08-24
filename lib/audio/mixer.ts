import { MASTER_BUS_CONFIG } from "../music/synthesis-presets.ts";

/**
 * Mixer
 * 
 * Responsável pelo gain staging, roteamento e controle de picos (Soft Clip / Peak Limiter).
 * Centraliza os barramentos (Buses) para evitar 'trackGainNodes' soltos.
 */
export class Mixer {
  private context: AudioContext;
  private masterGain: GainNode;
  private limiter: DynamicsCompressorNode;
  
  // Barramentos Principais
  private buses = new Map<string, AudioNode>();
  
  // Analisadores para Metering
  private masterAnalyzer: AnalyserNode;
  private drumAnalyzer: AnalyserNode;

  constructor(context: AudioContext) {
    this.context = context;

    // --- Master Bus Chain ---
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 1.0;

    this.masterAnalyzer = this.context.createAnalyser();
    this.masterAnalyzer.fftSize = 256;

    this.limiter = this.context.createDynamicsCompressor();
    // Parâmetros de True Peak Limiter agressivo
    this.limiter.threshold.value = -1.0;
    this.limiter.knee.value = 0.0;
    this.limiter.ratio.value = 20.0;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.1;

    // Roteamento Master: MasterGain -> Limiter -> Analyzer -> Destination
    this.masterGain.connect(this.limiter);
    this.limiter.connect(this.masterAnalyzer);
    this.masterAnalyzer.connect(this.context.destination);

    this.buses.set("master", this.masterGain);

    // --- Reverb Send Bus (Algorithmic Impulse Response) ---
    const reverbConvolver = this.context.createConvolver();
    reverbConvolver.buffer = this.generateImpulseResponse(1.2, 2.5);
    const reverbSendGain = this.context.createGain();
    reverbSendGain.gain.value = 0.18; // reverb wet amount
    const reverbPreDelay = this.context.createDelay();
    reverbPreDelay.delayTime.value = 0.012; // 12ms pre-delay for clarity
    const reverbHighpass = this.context.createBiquadFilter();
    reverbHighpass.type = "highpass";
    reverbHighpass.frequency.value = 250; // keep sub out of reverb

    // Chain: source → reverbSendGain → highpass → preDelay → convolver → master
    reverbSendGain.connect(reverbHighpass);
    reverbHighpass.connect(reverbPreDelay);
    reverbPreDelay.connect(reverbConvolver);
    reverbConvolver.connect(this.masterGain);

    this.buses.set("reverb_send", reverbSendGain);

    // --- Drums Bus Chain ---
    const drumsGain = this.context.createGain();
    drumsGain.gain.value = 1.0;
    
    // Soft Clipper para Drums (evita que transientes estalem antes do limiter)
    const softClipper = this.context.createWaveShaper();
    softClipper.curve = this.createSoftClipCurve() as any;
    softClipper.oversample = '4x'; // Upgraded from 2x for better quality

    this.drumAnalyzer = this.context.createAnalyser();
    this.drumAnalyzer.fftSize = 256;

    drumsGain.connect(softClipper);
    softClipper.connect(this.drumAnalyzer);
    this.drumAnalyzer.connect(this.masterGain);

    // Drums → subtle reverb send (snare/clap spatial width)
    const drumReverbSend = this.context.createGain();
    drumReverbSend.gain.value = 0.12;
    drumsGain.connect(drumReverbSend);
    drumReverbSend.connect(reverbSendGain);
    
    this.buses.set("drums", drumsGain);

    // --- Bass Bus Chain (com Ducking) ---
    // O Ducking (Sidechain) será aplicado via automação no gain do bassSidechainGain
    const bassGain = this.context.createGain();
    bassGain.gain.value = 1.0;
    const bassSidechainGain = this.context.createGain();
    bassSidechainGain.gain.value = 1.0;
    bassGain.connect(bassSidechainGain);
    bassSidechainGain.connect(this.masterGain);
    
    this.buses.set("bass", bassGain);
    this.buses.set("bass_sidechain", bassSidechainGain);

    // --- Melody Bus Chain (com Delay + Reverb) ---
    const melodyGain = this.context.createGain();
    melodyGain.gain.value = 1.0;
    
    // Send Effect: Delay
    const delayNode = this.context.createDelay();
    delayNode.delayTime.value = 0.24; // Sync tempo based delay
    const delayFeedback = this.context.createGain();
    delayFeedback.gain.value = 0.22;
    
    melodyGain.connect(this.masterGain); // dry
    melodyGain.connect(delayNode);       // delay send
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFeedback.connect(this.masterGain); // wet delay

    // Melody → reverb send (spatial depth)
    const melodyReverbSend = this.context.createGain();
    melodyReverbSend.gain.value = 0.22;
    melodyGain.connect(melodyReverbSend);
    melodyReverbSend.connect(reverbSendGain);

    this.buses.set("melody", melodyGain);
    this.buses.set("delay", delayNode);
  }

  /**
   * Generate algorithmic impulse response for ConvolverNode reverb.
   * Uses exponential decay with diffusion noise for a natural hall-like character.
   */
  private generateImpulseResponse(decaySec: number, damping: number): AudioBuffer {
    const sampleRate = this.context.sampleRate;
    const length = Math.ceil(sampleRate * decaySec);
    const buffer = this.context.createBuffer(2, length, sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-damping * t);
      // Stereo noise with different seeds for L/R decorrelation
      left[i] = (Math.random() * 2 - 1) * envelope;
      right[i] = (Math.random() * 2 - 1) * envelope;
    }
    return buffer;
  }

  private createSoftClipCurve(): Float32Array {
    const n_samples = 8192; // High resolution for quality
    const curve = new Float32Array(n_samples);
    const k = 2; // threshold for softness
    for (let i = 0; i < n_samples; i++) {
      const x = (i * 2) / n_samples - 1;
      // Formula baseada no dsp-renderer.ts
      curve[i] = ((Math.PI + k) * x) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  /**
   * Obtém o AudioNode de um barramento para conectar fontes de áudio.
   */
  public getBus(name: "master" | "drums" | "bass" | "bass_sidechain" | "melody" | "delay" | "reverb_send"): AudioNode {
    const bus = this.buses.get(name);
    if (!bus) {
      throw new Error(`Bus ${name} not found`);
    }
    return bus;
  }

  /**
   * Retorna os analisadores para medição de Peak/RMS (para a UI futura).
   */
  public getAnalyzers() {
    return {
      master: this.masterAnalyzer,
      drums: this.drumAnalyzer
    };
  }
}
