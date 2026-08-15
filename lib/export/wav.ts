import type { BassDrive, BassResult, DrumKitMode, DrumResult, MelodyLayer } from "../music/types";
import { encodeWav16Bit, renderDspAudio } from "./dsp-renderer";

/**
 * Downloads a WAV ArrayBuffer or Blob in the browser DOM.
 */
export function downloadWavBlob(
  data: ArrayBuffer | Uint8Array | Blob,
  filename = "AutoTunel-Master.wav"
) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart], { type: "audio/wav" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Direct Main-Thread WAV synthesis (used when Web Worker is bypassed or in tests).
 */
export async function renderAndDownloadWav({
  bpm,
  melodyLayers,
  bass,
  drums,
  loops = 2,
  bassDrive = "warm",
  drumKit = "trap-808",
  filename = "AutoTunel-Master.wav",
}: {
  bpm: number;
  melodyLayers?: MelodyLayer[];
  bass?: BassResult | null;
  drums?: DrumResult | null;
  loops?: number;
  bassDrive?: BassDrive;
  drumKit?: DrumKitMode;
  filename?: string;
}) {
  const { left, right, sampleRate } = renderDspAudio({
    bpm,
    melodyLayers,
    bass,
    drums,
    loops,
    bassDrive,
    drumKit,
    sampleRate: 44100,
  });

  const wavBuffer = encodeWav16Bit(left, right, sampleRate);
  downloadWavBlob(wavBuffer, filename);
}
