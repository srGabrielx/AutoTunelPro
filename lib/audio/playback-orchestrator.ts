import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./targets/playback-target";

export class PlaybackOrchestrator {
  private activeTarget: PlaybackTarget | null = null;
  private targets: PlaybackTarget[] = [];
  
  constructor() {
    this.targets = [];
  }

  registerTarget(target: PlaybackTarget) {
    this.targets.push(target);
  }

  async selectBestTarget() {
    // Ordem de prioridade: Mobile Native -> Desktop Native -> WebAudio
    for (const target of this.targets) {
      if (target.isAvailable()) {
        this.activeTarget = target;
        console.log(`[PlaybackOrchestrator] Selected target: ${target.name}`);
        return;
      }
    }
    throw new Error("No playback targets available");
  }

  async prepare(timeline: CanonicalTimeline) {
    if (!this.activeTarget) await this.selectBestTarget();
    if (this.activeTarget) {
      await this.activeTarget.prepare(timeline);
    }
  }

  async play(startTick?: number) {
    if (this.activeTarget) {
      await this.activeTarget.play(startTick);
    }
  }

  pause() {
    this.activeTarget?.pause();
  }

  stop() {
    this.activeTarget?.stop();
  }
  
  getState(): TransportState {
    return this.activeTarget?.getState() || "stopped";
  }

  onPlaybackTick(callback: (tick: number) => void) {
    // Precisa repassar o listener para o target ativo
    this.activeTarget?.onPlaybackTick(callback);
  }

  onStateChange(callback: (state: TransportState) => void) {
    this.activeTarget?.onStateChange(callback);
  }

  dispose() {
    this.targets.forEach(t => t.dispose());
    this.activeTarget = null;
  }
}

// Singleton instance
export const playbackOrchestrator = new PlaybackOrchestrator();
