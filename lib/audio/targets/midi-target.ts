import type { PlaybackTarget, CanonicalTimeline, TransportState } from "./playback-target";
// import { buildMidiFile } from "../../export/midi";

export class MidiTarget implements PlaybackTarget {
  name = "MidiTarget";
  private currentTimeline: CanonicalTimeline | null = null;
  private internalState: TransportState = "stopped";
  private stateCallbacks: Array<(state: TransportState) => void> = [];

  isAvailable(): boolean {
    return true; 
  }

  async prepare(timeline: CanonicalTimeline): Promise<void> {
    this.setState("preparing");
    this.currentTimeline = timeline;
    console.log(`[MidiTarget] Ready to construct MIDI file.`);
    this.setState("stopped");
  }

  async play(): Promise<void> {
    if (!this.currentTimeline) return;
    this.setState("playing");
    
    // Invocaria a serialização MIDI aqui.
    // const midiBytes = buildMidiFile(this.currentTimeline);
    
    this.setState("stopped");
  }

  pause(): void {}

  stop(): void {
    this.setState("stopped");
  }

  onPlaybackTick(callback: (tick: number) => void): void {}

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
