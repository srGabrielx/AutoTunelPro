import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./playback-target";

export class NativeDesktopTarget implements PlaybackTarget {
  name = "NativeDesktopTarget";
  private currentTimeline: CanonicalTimeline | null = null;
  private internalState: TransportState = "stopped";
  private tickCallbacks: Array<(tick: number) => void> = [];
  private stateCallbacks: Array<(state: TransportState) => void> = [];

  isAvailable(): boolean {
    // Basic heuristic to detect Tauri desktop environment
    return typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;
  }

  async prepare(timeline: CanonicalTimeline): Promise<void> {
    this.setState("preparing");
    this.currentTimeline = timeline;
    
    // Na implementação real, enviaríamos o timeline para o backend Rust via IPC
    // Ex: await invoke('load_timeline', { timeline: JSON.stringify(timeline) });
    
    console.log(`[NativeDesktopTarget] Prepared timeline with ${timeline.blocks.length} blocks for Rust processing.`);
    this.setState("stopped");
  }

  async play(startTick?: number): Promise<void> {
    if (!this.currentTimeline) return;
    this.setState("playing");
    // IPC to start playback natively
    // Ex: await invoke('play_audio', { startTick });
  }

  pause(): void {
    this.setState("paused");
    // IPC to pause playback
  }

  stop(): void {
    this.setState("stopped");
    // IPC to stop playback
  }

  onPlaybackTick(callback: (tick: number) => void): void {
    this.tickCallbacks.push(callback);
    // Listeners para IPC events emitidos pelo Rust informando a posição atual
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
    this.tickCallbacks = [];
    this.stateCallbacks = [];
  }
}
