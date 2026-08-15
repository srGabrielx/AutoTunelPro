import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer";
import { createMidiFile } from "../lib/export/midi";
import type {
  ExportMidiPayload,
  ExportWavPayload,
  WorkerErrorResponse,
  WorkerRequest,
  WorkerSuccessResponse,
} from "../lib/workers/protocol";

interface DedicatedWorkerScope {
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const workerScope = self as unknown as DedicatedWorkerScope;

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || !req.type) return;

  try {
    if (req.type === "export-midi") {
      const p: ExportMidiPayload = req.payload;
      const uint8 = createMidiFile({
        bpm: p.bpm,
        melodyLayers: p.melodyLayers,
        bass: p.bass,
        drums: p.drums,
      });

      // Create a fresh independent ArrayBuffer copy for safe zero-copy transfer
      const arrayBuffer = uint8.buffer.slice(
        uint8.byteOffset,
        uint8.byteOffset + uint8.byteLength
      ) as ArrayBuffer;

      const successRes: WorkerSuccessResponse = {
        type: "export-midi",
        requestId: req.requestId,
        success: true,
        data: {
          buffer: arrayBuffer,
          filename: p.filename || "AutoTunel-Beat.mid",
          byteLength: arrayBuffer.byteLength,
        },
      };

      // Zero-copy transfer of ArrayBuffer
      workerScope.postMessage(successRes, [arrayBuffer]);
    } else if (req.type === "export-wav") {
      const p: ExportWavPayload = req.payload;
      const { left, right, sampleRate } = renderDspAudio({
        bpm: p.bpm,
        melodyLayers: p.melodyLayers,
        bass: p.bass,
        drums: p.drums,
        loops: p.loops ?? 2,
        bassDrive: p.bassDrive ?? "warm",
        drumKit: p.drumKit ?? "trap-808",
        sampleRate: 44100,
      });

      const arrayBuffer = encodeWav16Bit(left, right, sampleRate);

      const successRes: WorkerSuccessResponse = {
        type: "export-wav",
        requestId: req.requestId,
        success: true,
        data: {
          buffer: arrayBuffer,
          filename: p.filename || "AutoTunel-Master.wav",
          byteLength: arrayBuffer.byteLength,
        },
      };

      // Zero-copy transfer of ArrayBuffer
      workerScope.postMessage(successRes, [arrayBuffer]);
    }
  } catch (err: unknown) {
    const errRes: WorkerErrorResponse = {
      requestId: req.requestId,
      success: false,
      error: {
        engine: req.type === "export-midi" ? "midi" : "wav",
        message: err instanceof Error ? err.message : "Falha na renderização de exportação",
      },
    };
    workerScope.postMessage(errRes);
  }
};
