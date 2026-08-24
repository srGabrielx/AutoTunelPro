import type {
  BassResult,
  DrumResult,
  MelodyResult,
} from "../music/types";
import type {
  ExportFileResponseData,
  ExportMidiPayload,
  ExportWavPayload,
  GenerateAllPayload,
  GenerateAllResponseData,
  GenerateBassPayload,
  GenerateDrumsPayload,
  GenerateMelodyPayload,
  WorkerRequest,
  WorkerResponse,
} from "./protocol";

interface PendingPromise {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timer: NodeJS.Timeout | number;
  worker: Worker;
  operationKey?: string;
}

export class SupersededWorkerRequestError extends Error {
  readonly code = "REQUEST_SUPERSEDED";
  readonly requestId: string;

  constructor(requestId: string) {
    super(`Requisição substituída por uma geração mais recente (${requestId})`);
    this.name = "SupersededWorkerRequestError";
    this.requestId = requestId;
  }
}

export class StudioWorkerRequestError extends Error {
  readonly requestId: string;
  readonly engine?: string;
  readonly code?: string;

  constructor(
    message: string,
    requestId: string,
    engine?: string,
    code?: string,
  ) {
    super(message);
    this.name = "StudioWorkerRequestError";
    this.requestId = requestId;
    this.engine = engine;
    this.code = code;
  }
}

export function isSupersededWorkerRequest(error: unknown): boolean {
  return error instanceof SupersededWorkerRequestError;
}

export class StudioWorkerClient {
  private studioWorker: Worker | null = null;
  private exportWorker: Worker | null = null;
  private pendingRequests = new Map<string, PendingPromise>();
  private latestRequestByOperation = new Map<string, string>();
  private requestCounter = 0;
  private isTerminated = false;

  constructor() {
    this.initWorkers();
  }

  private initWorkers() {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return;
    }

    try {
      this.studioWorker = new Worker(
        new URL("../../workers/studio.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.studioWorker.onmessage = this.handleWorkerMessage.bind(this);
      this.studioWorker.onerror = (err) => {
        console.error("[StudioWorker Error]", err);
      };
    } catch (e) {
      console.warn("Studio worker could not be initialized:", e);
    }

    try {
      this.exportWorker = new Worker(
        new URL("../../workers/export.worker.ts", import.meta.url),
        { type: "module" }
      );
      this.exportWorker.onmessage = this.handleWorkerMessage.bind(this);
      this.exportWorker.onerror = (err) => {
        console.error("[ExportWorker Error]", err);
      };
    } catch (e) {
      console.warn("Export worker could not be initialized:", e);
    }
  }

  private nextRequestId(prefix: string): string {
    this.requestCounter += 1;
    return `${prefix}-${this.requestCounter}`;
  }

  private postCancellation(worker: Worker, targetRequestId: string) {
    const cancelReq: WorkerRequest = {
      type: "cancel",
      requestId: this.nextRequestId("cancel"),
      payload: { targetRequestId },
    };
    worker.postMessage(cancelReq);
  }

  private supersede(operationKey: string) {
    const previousRequestId = this.latestRequestByOperation.get(operationKey);
    if (!previousRequestId) return;

    const previous = this.pendingRequests.get(previousRequestId);
    if (!previous) return;

    clearTimeout(previous.timer as NodeJS.Timeout);
    this.pendingRequests.delete(previousRequestId);
    this.postCancellation(previous.worker, previousRequestId);
    previous.reject(new SupersededWorkerRequestError(previousRequestId));
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const res = event.data;
    if (!res || !res.requestId) return;

    const pending = this.pendingRequests.get(res.requestId);
    if (!pending) {
      // Stale or already cancelled response
      return;
    }

    clearTimeout(pending.timer as NodeJS.Timeout);
    this.pendingRequests.delete(res.requestId);
    if (
      pending.operationKey &&
      this.latestRequestByOperation.get(pending.operationKey) === res.requestId
    ) {
      this.latestRequestByOperation.delete(pending.operationKey);
    }

    if (res.success) {
      if (res.type === "generate-melody") {
        pending.resolve(res.data);
      } else if (res.type === "generate-bass") {
        pending.resolve(res.data);
      } else if (res.type === "generate-drums") {
        pending.resolve(res.data);
      } else if (res.type === "generate-all") {
        pending.resolve(res.data);
      } else if (res.type === "export-midi" || res.type === "export-wav") {
        pending.resolve(res.data);
      } else if (res.type === "cancel") {
        pending.resolve(res.data);
      }
    } else {
      pending.reject(
        new StudioWorkerRequestError(
          res.error.message,
          res.requestId,
          res.error.engine,
          res.error.code,
        ),
      );
    }
  }

  private send<T>(
    worker: Worker | null,
    req: WorkerRequest,
    timeoutMs = 30000,
    operationKey?: string,
  ): Promise<T> {
    if (this.isTerminated) {
      return Promise.reject(new Error("Worker client has been terminated"));
    }

    if (!worker) {
      return Promise.reject(
        new Error("Web Worker não suportado ou não disponível neste ambiente.")
      );
    }

    if (operationKey) {
      this.supersede(operationKey);
      this.latestRequestByOperation.set(operationKey, req.requestId);
    }

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(req.requestId)) {
          this.pendingRequests.delete(req.requestId);
          if (
            operationKey &&
            this.latestRequestByOperation.get(operationKey) === req.requestId
          ) {
            this.latestRequestByOperation.delete(operationKey);
          }
          this.postCancellation(worker, req.requestId);
          reject(
            new StudioWorkerRequestError(
              `Timeout na requisição ${req.type} (${req.requestId})`,
              req.requestId,
              req.type,
              "REQUEST_TIMEOUT",
            ),
          );
        }
      }, timeoutMs);

      this.pendingRequests.set(req.requestId, {
        resolve: resolve as (value: unknown) => void,
        reject,
        timer,
        worker,
        operationKey,
      });

      worker.postMessage(req);
    });
  }

  public generateMelody(payload: GenerateMelodyPayload): Promise<MelodyResult> {
    const requestId = this.nextRequestId("melody");
    const req: WorkerRequest = {
      type: "generate-melody",
      requestId,
      payload,
    };
    return this.send<MelodyResult>(this.studioWorker, req, 30000, `melody:${payload.layerId}`);
  }

  public generateBass(payload: GenerateBassPayload): Promise<BassResult> {
    const requestId = this.nextRequestId("bass");
    const req: WorkerRequest = {
      type: "generate-bass",
      requestId,
      payload,
    };
    return this.send<BassResult>(this.studioWorker, req, 30000, "bass");
  }

  public generateDrums(payload: GenerateDrumsPayload): Promise<DrumResult> {
    const requestId = this.nextRequestId("drums");
    const req: WorkerRequest = {
      type: "generate-drums",
      requestId,
      payload,
    };
    return this.send<DrumResult>(this.studioWorker, req, 30000, "drums");
  }

  public generateAll(payload: GenerateAllPayload): Promise<GenerateAllResponseData> {
    const requestId = this.nextRequestId("all");
    const req: WorkerRequest = {
      type: "generate-all",
      requestId,
      payload,
    };
    return this.send<GenerateAllResponseData>(this.studioWorker, req, 45000, "arrangement");
  }

  public exportMidi(payload: ExportMidiPayload): Promise<ExportFileResponseData> {
    const requestId = this.nextRequestId("midi");
    const req: WorkerRequest = {
      type: "export-midi",
      requestId,
      payload,
    };
    return this.send<ExportFileResponseData>(this.exportWorker, req, 30000, "export-midi");
  }

  public exportWav(payload: ExportWavPayload): Promise<ExportFileResponseData> {
    const requestId = this.nextRequestId("wav");
    const req: WorkerRequest = {
      type: "export-wav",
      requestId,
      payload,
    };
    return this.send<ExportFileResponseData>(this.exportWorker, req, 60000, "export-wav");
  }

  public cancel(targetRequestId: string) {
    if (this.isTerminated) return;
    const pending = this.pendingRequests.get(targetRequestId);
    if (!pending) return;

    clearTimeout(pending.timer as NodeJS.Timeout);
    this.pendingRequests.delete(targetRequestId);
    if (
      pending.operationKey &&
      this.latestRequestByOperation.get(pending.operationKey) === targetRequestId
    ) {
      this.latestRequestByOperation.delete(pending.operationKey);
    }
    this.postCancellation(pending.worker, targetRequestId);
    pending.reject(new SupersededWorkerRequestError(targetRequestId));
  }

  public terminate() {
    this.isTerminated = true;
    this.pendingRequests.forEach((p) => {
      clearTimeout(p.timer as NodeJS.Timeout);
      p.reject(new Error("Worker terminated"));
    });
    this.pendingRequests.clear();
    this.latestRequestByOperation.clear();

    if (this.studioWorker) {
      this.studioWorker.terminate();
      this.studioWorker = null;
    }
    if (this.exportWorker) {
      this.exportWorker.terminate();
      this.exportWorker = null;
    }
  }
}
