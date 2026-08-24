import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./playback-target";
// Import the existing DSP renderer functions when fully refactored
// import { renderToOfflineAudioContext } from "../../export/dsp-renderer";

export class WavRenderTarget implements PlaybackTarget {
  name = "WavRenderTarget";
  private currentTimeline: CanonicalTimeline | null = null;
  private internalState: TransportState = "stopped";
  private stateCallbacks: Array<(state: TransportState) => void> = [];

  isAvailable(): boolean {
    return true; // Sempre disponível (via OfflineAudioContext no Web ou via Rust nativo no Tauri)
  }

  async prepare(timeline: CanonicalTimeline): Promise<void> {
    this.setState("preparing");
    this.currentTimeline = timeline;
    console.log(`[WavRenderTarget] Ready to render offline WAV.`);
    this.setState("stopped");
  }

  async play(): Promise<void> {
    if (!this.currentTimeline) return;
    this.setState("playing");
    
    // Invocaria a renderização offline aqui.
    // Como a exportação não é reprodução em tempo real (é offline bounce),
    // o estado passa direto para completed/stopped após a renderização.
    
    // const wavBlob = await renderToOfflineAudioContext(this.currentTimeline);
    
    this.setState("stopped");
  }

  pause(): void {
    // Unsupported in offline rendering
  }

  stop(): void {
    this.setState("stopped");
  }

  onPlaybackTick(callback: (tick: number) => void): void {
    // Pode emitir progresso da renderização
  }

  onStateChange(callback: (state: TransportState) => void): void {
    this.stateCallbacks.push(callback);
  }

  getState(): TransportState {
    return this.internalState;
  }

  private setState(newState: TransportState) {
    if (this.internalState !== newState) {
      this.internalState = newState;
      this.stateCallbacks.forEach(cb => cb(newState));
    }
  }

  dispose(): void {
    this.stop();
    this.stateCallbacks = [];
  }
}
