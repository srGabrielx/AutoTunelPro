import test from "node:test";
import assert from "node:assert/strict";

class FakeWorker {
  static instances = [];

  messages = [];
  onmessage = null;
  onerror = null;

  constructor() {
    FakeWorker.instances.push(this);
  }

  postMessage(message) {
    this.messages.push(message);
  }

  terminate() {}

  respond(data) {
    this.onmessage?.({ data });
  }
}

globalThis.window = {};
globalThis.Worker = FakeWorker;

const {
  StudioWorkerClient,
  SupersededWorkerRequestError,
} = await import("../lib/workers/studio-worker-client.ts");

const payload = {
  bpm: 124,
  key: "C",
  globalScale: "natural-minor",
  complexity: 4,
  bassStyle: "trap-br",
  bassOctave: -24,
  drumStyle: "trap-br",
  drumPattern: "standard",
  melodyLayers: [],
  seed: 1234,
  variationIndex: 0,
};

test("worker client: a newer arrangement request supersedes and cancels the older one", async () => {
  FakeWorker.instances.length = 0;
  const client = new StudioWorkerClient();
  const studio = FakeWorker.instances[0];

  const older = client.generateAll(payload);
  const olderRequest = studio.messages.find((message) => message.type === "generate-all");
  const newer = client.generateAll({ ...payload, variationIndex: 1 });
  const generationMessages = studio.messages.filter((message) => message.type === "generate-all");
  const newerRequest = generationMessages[1];
  const cancellation = studio.messages.find(
    (message) => message.type === "cancel" && message.payload.targetRequestId === olderRequest.requestId,
  );

  await assert.rejects(older, SupersededWorkerRequestError);
  assert.ok(cancellation, "the superseded worker job must receive an explicit cancel message");

  const expected = { blocks: [], marker: "newer" };
  studio.respond({
    type: "generate-all",
    requestId: newerRequest.requestId,
    success: true,
    data: expected,
  });
  assert.deepEqual(await newer, expected);

  studio.respond({
    type: "generate-all",
    requestId: olderRequest.requestId,
    success: true,
    data: { blocks: [], marker: "older" },
  });

  client.terminate();
});
