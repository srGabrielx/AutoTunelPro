import { encodeWav16Bit, renderDspAudio } from "../lib/export/dsp-renderer.ts";
import { createIndividualMidiFiles, createMidiExport } from "../lib/export/midi.ts";
import { createZipArchive } from "../lib/export/zip-builder.ts";
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

      let arrayBuffer: ArrayBuffer;
      let defaultFilename: string;
      let timelineHash: string;
      let arrangementEndTick: number;
      let durationSeconds: number;

      if (p.format === "zip") {
        const stems = createIndividualMidiFiles({
          bpm: p.bpm,
          melodyLayers: p.melodyLayers,
          blocks: p.blocks,
          muteBass: p.muteBass,
          muteDrums: p.muteDrums,
        });

        // Also add the full multitrack MIDI inside the ZIP
        const full = createMidiExport({
          bpm: p.bpm,
          melodyLayers: p.melodyLayers,
          blocks: p.blocks,
          muteBass: p.muteBass,
          muteDrums: p.muteDrums,
          timeline: stems.timeline,
        });

        const zipBytes = createZipArchive([
          { filename: "Full_Composition.mid", data: full.data },
          ...stems.files.map((f) => ({ filename: f.filename, data: f.data })),
        ]);

        arrayBuffer = zipBytes.buffer.slice(
          zipBytes.byteOffset,
          zipBytes.byteOffset + zipBytes.byteLength
        ) as ArrayBuffer;

        defaultFilename = "AutoTunel-MIDI-Stems.zip";
        timelineHash = stems.timeline.timelineHash;
        arrangementEndTick = stems.timeline.arrangementEndTick;
        durationSeconds = stems.timeline.durationSeconds;
      } else {
        const artifact = createMidiExport({
          bpm: p.bpm,
          melodyLayers: p.melodyLayers,
          blocks: p.blocks,
          muteBass: p.muteBass,
          muteDrums: p.muteDrums,
        });
        const uint8 = artifact.data;

        // Create a fresh independent ArrayBuffer copy for safe zero-copy transfer
        arrayBuffer = uint8.buffer.slice(
          uint8.byteOffset,
          uint8.byteOffset + uint8.byteLength
        ) as ArrayBuffer;

        defaultFilename = "AutoTunel-Beat.mid";
        timelineHash = artifact.timeline.timelineHash;
        arrangementEndTick = artifact.timeline.arrangementEndTick;
        durationSeconds = artifact.timeline.durationSeconds;
      }

      const successRes: WorkerSuccessResponse = {
        type: "export-midi",
        requestId: req.requestId,
        success: true,
        data: {
          buffer: arrayBuffer,
          filename: p.filename || defaultFilename,
          byteLength: arrayBuffer.byteLength,
          timelineHash,
          arrangementEndTick,
          durationSeconds,
        },
      };

      // Zero-copy transfer of ArrayBuffer
      workerScope.postMessage(successRes, [arrayBuffer]);
    } else if (req.type === "export-wav") {
      const p: ExportWavPayload = req.payload;
      const rendered = renderDspAudio({
        bpm: p.bpm,
        melodyLayers: p.melodyLayers,
        blocks: p.blocks,
        muteBass: p.muteBass,
        muteDrums: p.muteDrums,
        loops: p.loops ?? 1,
        tailSeconds: p.tailSeconds,
        bassDrive: p.bassDrive ?? "warm",
        drumKit: p.drumKit ?? "trap-808",
        trackSettings: p.trackSettings,
        sampleRate: 44100,
      });
      const { left, right, sampleRate } = rendered;

      const arrayBuffer = encodeWav16Bit(left, right, sampleRate);

      const successRes: WorkerSuccessResponse = {
        type: "export-wav",
        requestId: req.requestId,
        success: true,
        data: {
          buffer: arrayBuffer,
          filename: p.filename || "AutoTunel-Master.wav",
          byteLength: arrayBuffer.byteLength,
          timelineHash: rendered.timelineHash,
          arrangementEndTick: rendered.timeline.arrangementEndTick,
          durationSeconds: rendered.durationSeconds,
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
