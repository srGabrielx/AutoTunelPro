/**
 * Downloads a WAV ArrayBuffer or Blob in the browser DOM.
 * This is a pure helper — all rendering happens in export.worker.ts via StudioWorkerClient.
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

