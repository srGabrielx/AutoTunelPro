import { type CanonicalTimelineBlock } from "../../music/canonical-timeline";

export interface CanonicalTimeline {
  blocks: CanonicalTimelineBlock[];
  totalDurationSeconds: number;
  arrangementEndTick: number;
}

export type TransportState = "playing" | "paused" | "stopped" | "preparing";

export interface PlaybackTarget {
  name: string;
  isAvailable(): boolean;
  
  prepare(timeline: CanonicalTimeline): Promise<void>;
  
  play(startTick?: number): Promise<void>;
  pause(): void;
  stop(): void;
  
  onPlaybackTick(callback: (tick: number) => void): void;
  onStateChange(callback: (state: TransportState) => void): void;
  
  getState(): TransportState;
  
  dispose(): void;
}
