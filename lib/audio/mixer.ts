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

    // --- Drums Bus Chain ---
    const drumsGain = this.context.createGain();
    drumsGain.gain.value = 1.0;
    
    // Soft Clipper para Drums (evita que transientes estalem antes do limiter)
    const softClipper = this.context.createWaveShaper();
    softClipper.curve = this.createSoftClipCurve() as any;
    softClipper.oversample = '2x';

    this.drumAnalyzer = this.context.createAnalyser();
    this.drumAnalyzer.fftSize = 256;

    drumsGain.connect(softClipper);
    softClipper.connect(this.drumAnalyzer);
    this.drumAnalyzer.connect(this.masterGain);
    
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

    // --- Melody Bus Chain (com Delay) ---
    const melodyGain = this.context.createGain();
    melodyGain.gain.value = 1.0;
    
    // Send Effect: Delay
    const delayNode = this.context.createDelay();
    delayNode.delayTime.value = 0.24; // Sync tempo based delay (e.g., 1/8 dot at 140bpm ~ 0.32, but fixed here or updated externally)
    const delayFeedback = this.context.createGain();
    delayFeedback.gain.value = 0.22;
    
    melodyGain.connect(this.masterGain); // dry
    melodyGain.connect(delayNode);       // send
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);
    delayFeedback.connect(this.masterGain); // wet

    this.buses.set("melody", melodyGain);
    this.buses.set("delay", delayNode);
  }

  private createSoftClipCurve(): Float32Array {
    const n_samples = 1024;
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
  public getBus(name: "master" | "drums" | "bass" | "bass_sidechain" | "melody" | "delay"): AudioNode {
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
