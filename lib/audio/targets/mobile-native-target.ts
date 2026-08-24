import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./playback-target";

export class MobileNativeTarget implements PlaybackTarget {
  name = "MobileNativeTarget";
  private currentTimeline: CanonicalTimeline | null = null;
  private internalState: TransportState = "stopped";
  private tickCallbacks: Array<(tick: number) => void> = [];
  private stateCallbacks: Array<(state: TransportState) => void> = [];

  isAvailable(): boolean {
    // Basic heuristic to detect Tauri mobile environment
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI__ !== undefined;
    const isMobile = /android|iphone|ipad/i.test(navigator.userAgent);
    return isTauri && isMobile;
  }

  async prepare(timeline: CanonicalTimeline): Promise<void> {
    this.setState("preparing");
    this.currentTimeline = timeline;
    
    // Na implementação real, comunicará com plugins Tauri para iOS/Android
    // Ex: delegando síntese nativa para Kotlin/Swift
    console.log(`[MobileNativeTarget] Prepared timeline for mobile processing.`);
    this.setState("stopped");
  }

  async play(startTick?: number): Promise<void> {
    if (!this.currentTimeline) return;
    this.setState("playing");
    // Native play hook
  }

  pause(): void {
    this.setState("paused");
  }

  stop(): void {
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
    this.tickCallbacks = [];
    this.stateCallbacks = [];
  }
}
