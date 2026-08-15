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

interface DedicatedWorkerScope {
  postMessage: (msg: unknown, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
}

const workerScope = self as unknown as DedicatedWorkerScope;

// Keep active AbortControllers mapped by requestId
const activeControllers = new Map<string, AbortController>();

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
        const res = await fetch("/api/melody", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            style: p.style,
            bpm: p.bpm,
            key: p.key,
            scale: p.scale,
            complexity: p.complexity,
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
        const res = await fetch("/api/drums", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            style: p.style,
            bpm: p.bpm,
            drumPattern: p.drumPattern,
            complexity: p.complexity,
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

        const melodyPromises = p.melodyLayers.map(async (layer) => {
          const res = await fetch("/api/melody", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              style: layer.style,
              bpm: p.bpm,
              key: layer.key,
              scale: layer.scale,
              complexity: p.complexity,
            }),
          });
          if (!res.ok) {
            throw { engine: "melody", message: `Erro ao gerar melodia camada ${layer.id}` };
          }
          const melodyData: MelodyResult = await res.json();
          return { layerId: layer.id, result: melodyData };
        });

        const bassPromise = (async () => {
          const res = await fetch("/api/bass", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              style: p.bassStyle,
              bpm: p.bpm,
              key: p.key,
              scale: p.globalScale,
              bassOctave: p.bassOctave,
              complexity: p.complexity,
            }),
          });
          if (!res.ok) throw { engine: "bass", message: `Erro ao gerar bass` };
          const bassData: BassResult = await res.json();
          return bassData;
        })();

        const drumsPromise = (async () => {
          const res = await fetch("/api/drums", {
            method: "POST",
            headers: { "content-type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              style: p.drumStyle,
              bpm: p.bpm,
              drumPattern: p.drumPattern,
              complexity: p.complexity,
            }),
          });
          if (!res.ok) throw { engine: "drums", message: `Erro ao gerar drums` };
          const drumsData: DrumResult = await res.json();
          return drumsData;
        })();

        // Orchestrate ALL parallel requests simultaneously in a single Promise.all
        const [bassResult, drumResult, ...melodyResults] = await Promise.all([
          bassPromise,
          drumsPromise,
          ...melodyPromises,
        ]);

        const allData: GenerateAllResponseData = {
          bass: bassResult,
          drums: drumResult,
          melodyResults,
        };

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
