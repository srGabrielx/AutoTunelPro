import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./playback-target";
import { SampleAccurateAudioEngine } from "../../music/audio-transport";

export class WebAudioTarget implements PlaybackTarget {
  name = "WebAudioTarget";
  private engine: SampleAccurateAudioEngine | null = null;
  private currentTimeline: CanonicalTimeline | null = null;
  private tickCallbacks: Array<(tick: number) => void> = [];
  private stateCallbacks: Array<(state: TransportState) => void> = [];
  private internalState: TransportState = "stopped";

  isAvailable(): boolean {
    return typeof window !== "undefined" && !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  async prepare(timeline: CanonicalTimeline): Promise<void> {
    this.setState("preparing");
    this.currentTimeline = timeline;
    
    // Lazy initialize
    if (!this.engine) {
      this.engine = new SampleAccurateAudioEngine();
    }
    
    // O WebAudioEngine original foi adaptado para consumir o que ele precisava. 
    // Por enquanto, faremos apenas o handshake necessário.
    this.setState("stopped");
  }

  async play(startTick?: number): Promise<void> {
    if (!this.engine || !this.currentTimeline) return;
    
    this.setState("playing");
    // Opcionalmente podemos chamar o startPlayback do engine real aqui
    // this.engine.startPlayback();
    // TODO: Connect to the engine's playback loops and bridge the callback
  }

  pause(): void {
    if (this.engine) {
      this.engine.stop();
    }
    this.setState("paused");
  }

  stop(): void {
    if (this.engine) {
      this.engine.stop();
    }
    this.setState("stopped");
  }

  onPlaybackTick(callback: (tick: number) => void): void {
    this.tickCallbacks.push(callback);
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
    this.engine = null;
    this.tickCallbacks = [];
    this.stateCallbacks = [];
  }
}
