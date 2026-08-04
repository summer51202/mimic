import assert from "node:assert/strict";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import {
  checkHealth,
  parseArgs,
  verifyRevision,
} from "./verify-local-runtime.mjs";

async function withServer(handler, run) {
  const server = http.createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    await run(`http://127.0.0.1:${address.port}/api/v1`);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("parseArgs accepts health-only, base URL, and expected revision", () => {
  assert.deepEqual(
    parseArgs([
      "--health-only",
      "--base-url",
      "http://localhost:3001/api/v1/",
      "--expected-revision",
      "e40aba9",
    ]),
    {
      apiBaseUrl: "http://localhost:3001/api/v1",
      expectedRevision: "e40aba9",
      healthOnly: true,
    },
  );
});

test("checkHealth requests the exact health URL", async () => {
  await withServer((request, response) => {
    assert.equal(request.url, "/api/v1/health");
    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"data":{"ok":true}}');
  }, async (apiBaseUrl) => {
    const result = await checkHealth(apiBaseUrl, "test checkpoint");
    assert.equal(result.healthUrl, `${apiBaseUrl}/health`);
  });
});

test("checkHealth reports the exact URL when unavailable", async () => {
  const apiBaseUrl = "http://127.0.0.1:1/api/v1";
  await assert.rejects(
    checkHealth(apiBaseUrl, "preflight", { timeoutMs: 100 }),
    (error) => {
      assert.match(
        error.message,
        /Health checkpoint failed \(preflight\):/,
      );
      assert.ok(error.message.includes(`${apiBaseUrl}/health`));
      return true;
    },
  );
});

test("verifyRevision rejects a configured backend revision mismatch", () => {
  assert.throws(
    () => verifyRevision("backend-e40aba9", "backend-deadbee"),
    /Backend revision mismatch: expected backend-e40aba9, received backend-deadbee/,
  );
});

test("verifyRevision permits an unset backend revision", () => {
  assert.doesNotThrow(() => verifyRevision("backend-e40aba9", undefined));
});
