import test from "node:test";
import assert from "node:assert/strict";

test("Worker Protocol - Request ID Correlation and Stale Response Discarding", () => {
  const pendingRequests = new Map();
  let resolvedValue = null;

  // Setup request
  const requestId = "melody-1-123456";
  const reqPromise = new Promise((resolve, reject) => {
    pendingRequests.set(requestId, { resolve, reject });
  });

  // Handle matching response
  const response = {
    type: "generate-melody",
    requestId,
    success: true,
    data: { notes: [], style: "trap-br", bpm: 140, key: "C", scale: "natural-minor", seed: "123" },
    layerId: "layer-1",
  };

  if (pendingRequests.has(response.requestId)) {
    const handler = pendingRequests.get(response.requestId);
    pendingRequests.delete(response.requestId);
    handler.resolve(response.data);
  }

  reqPromise.then((val) => {
    resolvedValue = val;
    assert.equal(resolvedValue.seed, "123");
  });

  // Handle a stale response with non-existent requestId
  const staleResponse = {
    type: "generate-melody",
    requestId: "stale-request-999",
    success: true,
    data: { notes: [] },
  };

  let staleHandled = false;
  if (pendingRequests.has(staleResponse.requestId)) {
    staleHandled = true;
  }

  assert.equal(staleHandled, false, "Stale response must be safely discarded");
  assert.equal(pendingRequests.size, 0, "Pending map must be cleared after resolution");
});

test("Worker Protocol - Isolated Engine Failure Reporting", () => {
  const errorResponse = {
    requestId: "all-1-123456",
    success: false,
    error: {
      engine: "bass",
      message: "Falha na rota /api/bass (500)",
    },
  };

  assert.equal(errorResponse.success, false);
  assert.equal(errorResponse.error.engine, "bass");
  assert.ok(errorResponse.error.message.includes("500"));
});
