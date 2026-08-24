import type {
  BassResult,
  DrumResult,
  MelodyResult,
} from "../lib/music/types";
import type {
  GenerateAllPayload,
  GenerateAllResponseData,
  GenerateBassPayload,
  GenerateDrumsPayload,
  GenerateMelodyPayload,
  WorkerErrorResponse,
  WorkerRequest,
  WorkerSuccessResponse,
} from "../lib/workers/protocol";
import {
  generateFullComposition,
  regenerateCompositionTrack,
} from "../lib/music/full-composition.ts";
import { generateMelody } from "../lib/engines/melody.ts";
import { generateBass } from "../lib/engines/bass.ts";
import { generateDrums } from "../lib/engines/drums.ts";
import { deriveSeed } from "../lib/music/random.ts";

interface DedicatedWorkerScope {
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const workerScope = self as unknown as DedicatedWorkerScope;

// Keep active AbortControllers mapped by requestId
const activeControllers = new Map<string, AbortController>();
let implicitFullVariationIndex = 0;
const implicitSelectiveVariations = new Map<string, number>();

function resolveSelectiveSeed(explicitSeed: number | undefined, operation: string): number {
  if (explicitSeed !== undefined) return explicitSeed;
  const variation = implicitSelectiveVariations.get(operation) ?? 0;
  implicitSelectiveVariations.set(operation, variation + 1);
  return deriveSeed(0, "studio-worker", operation, `variation:${variation}`);
}

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || !req.type) return;

  if (req.type === "cancel") {
    const controller = activeControllers.get(req.payload.targetRequestId);
    if (controller) {
      controller.abort();
      activeControllers.delete(req.payload.targetRequestId);
    }
    const res: WorkerSuccessResponse = {
      type: "cancel",
      requestId: req.requestId,
      success: true,
      data: { cancelledRequestId: req.payload.targetRequestId },
    };
    workerScope.postMessage(res);
    return;
  }

  const controller = new AbortController();
  activeControllers.set(req.requestId, controller);

  try {
    switch (req.type) {
      case "generate-melody": {
        const p: GenerateMelodyPayload = req.payload;
        const seed = resolveSelectiveSeed(p.seed, `melody:${p.layerId}`);
        if (p.context) {
          const data = regenerateCompositionTrack({
            track: "melody",
            layerId: p.layerId,
            seed,
            context: p.context,
          });
          const successRes: WorkerSuccessResponse = {
            type: "generate-melody",
            requestId: req.requestId,
            success: true,
            layerId: p.layerId,
            data,
          };
          workerScope.postMessage(successRes);
          break;
        }

        const res = await fetch("/api/melody", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            style: p.style,
            synthType: p.synthType,
            bpm: p.bpm,
            key: p.key,
            scale: p.scale,
            complexity: p.complexity,
            seed,
          }),
        });

        if (!res.ok) {
          throw { engine: "melody", message: `Falha na rota /api/melody (${res.status})` };
        }

        const data: MelodyResult = await res.json();
        const successRes: WorkerSuccessResponse = {
          type: "generate-melody",
          requestId: req.requestId,
          success: true,
          layerId: p.layerId,
          data,
        };
        workerScope.postMessage(successRes);
        break;
      }

      case "generate-bass": {
        const p: GenerateBassPayload = req.payload;
        const seed = resolveSelectiveSeed(
          p.seed,
          `bass:${p.context?.block.id ?? "legacy"}`,
        );
        if (p.context) {
          const data = regenerateCompositionTrack({
            track: "bass",
            seed,
            context: p.context,
          });
          const successRes: WorkerSuccessResponse = {
            type: "generate-bass",
            requestId: req.requestId,
            success: true,
            data,
          };
          workerScope.postMessage(successRes);
          break;
        }

        const res = await fetch("/api/bass", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            style: p.style,
            bpm: p.bpm,
            key: p.key,
            scale: p.scale,
            bassOctave: p.bassOctave,
            complexity: p.complexity,
            seed,
          }),
        });

        if (!res.ok) {
          throw { engine: "bass", message: `Falha na rota /api/bass (${res.status})` };
        }

        const data: BassResult = await res.json();
        const successRes: WorkerSuccessResponse = {
          type: "generate-bass",
          requestId: req.requestId,
          success: true,
          data,
        };
        workerScope.postMessage(successRes);
        break;
      }

      case "generate-drums": {
        const p: GenerateDrumsPayload = req.payload;
        const seed = resolveSelectiveSeed(
          p.seed,
          `drums:${p.context?.block.id ?? "legacy"}`,
        );
        if (p.context) {
          const data = regenerateCompositionTrack({
            track: "drums",
            seed,
            context: p.context,
          });
          const successRes: WorkerSuccessResponse = {
            type: "generate-drums",
            requestId: req.requestId,
            success: true,
            data,
          };
          workerScope.postMessage(successRes);
          break;
        }

        const res = await fetch("/api/drums", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            style: p.style,
            bpm: p.bpm,
            drumPattern: p.drumPattern,
            complexity: p.complexity,
            swing: p.swing,
            rollDensity: p.rollDensity,
            humanize: p.humanize,
            seed,
          }),
        });

        if (!res.ok) {
          throw { engine: "drums", message: `Falha na rota /api/drums (${res.status})` };
        }

        const data: DrumResult = await res.json();
        const successRes: WorkerSuccessResponse = {
          type: "generate-drums",
          requestId: req.requestId,
          success: true,
          data,
        };
        workerScope.postMessage(successRes);
        break;
      }

      case "generate-all": {
        const p: GenerateAllPayload = req.payload;
        const variationIndex = p.variationIndex ?? (
          p.seed === undefined ? implicitFullVariationIndex++ : 0
        );
        if (controller.signal.aborted) break;
        const allData: GenerateAllResponseData = generateFullComposition({
          ...p,
          variationIndex,
        });
        if (controller.signal.aborted) break;

        const successRes: WorkerSuccessResponse = {
          type: "generate-all",
          requestId: req.requestId,
          success: true,
          data: allData,
        };
        workerScope.postMessage(successRes);
        break;
      }
    }
  } catch (err: unknown) {
    if (controller.signal.aborted) {
      return; // Ignore aborted requests
    }

    const typedErr = err as { engine?: "melody" | "bass" | "drums" | "all"; message?: string };
    const errRes: WorkerErrorResponse = {
      requestId: req.requestId,
      success: false,
      error: {
        engine: typedErr?.engine || "all",
        message: typedErr?.message || (err instanceof Error ? err.message : "Erro interno no worker"),
      },
    };
    workerScope.postMessage(errRes);
  } finally {
    activeControllers.delete(req.requestId);
  }
};
