import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { once } from "node:events";
import http from "node:http";
import test from "node:test";

import {
  checkHealth,
  createPlaywrightCommand,
  normalizeApiBaseUrl,
  normalizeWebBaseUrl,
  parseArgs,
  resolveExpectedRevision,
  runAcceptance,
  waitForChild,
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

test("checkHealth requires the exact live and ready endpoints", async () => {
  await withServer((request, response) => {
    assert.ok(
      ["/api/v1/health/live", "/api/v1/health/ready"].includes(request.url),
    );
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      request.url === "/api/v1/health/live"
        ? '{"data":{"ok":true,"revision":"e40aba9"}}'
        : '{"data":{"ok":true}}',
    );
  }, async (apiBaseUrl) => {
    const result = await checkHealth(apiBaseUrl, "test checkpoint", "e40aba9");
    assert.equal(result.liveUrl, `${apiBaseUrl}/health/live`);
    assert.equal(result.readyUrl, `${apiBaseUrl}/health/ready`);
    assert.equal(result.revision, "e40aba9");
  });
});

test("checkHealth reports the exact URL when unavailable", async () => {
  const apiBaseUrl = "http://127.0.0.1:1/api/v1";
  await assert.rejects(
    checkHealth(apiBaseUrl, "preflight", "e40aba9", { timeoutMs: 100 }),
    (error) => {
      assert.match(
        error.message,
        /Liveness checkpoint failed \(preflight\):/,
      );
      assert.ok(error.message.includes(`${apiBaseUrl}/health/live`));
      return true;
    },
  );
});

test("checkHealth rejects a backend with no process revision", async () => {
  await withServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      request.url === "/api/v1/health/live"
        ? '{"data":{"ok":true}}'
        : '{"data":{"ok":true}}',
    );
  }, async (apiBaseUrl) => {
    await assert.rejects(
      checkHealth(apiBaseUrl, "preflight", "e40aba9"),
      /Backend revision missing at .*\/api\/v1\/health\/live; expected e40aba9/,
    );
  });
});

test("checkHealth rejects a stale backend process revision", async () => {
  await withServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      request.url === "/api/v1/health/live"
        ? '{"data":{"ok":true,"revision":"deadbee"}}'
        : '{"data":{"ok":true}}',
    );
  }, async (apiBaseUrl) => {
    await assert.rejects(
      checkHealth(apiBaseUrl, "preflight", "e40aba9"),
      /Backend revision mismatch at .*\/api\/v1\/health\/live: expected e40aba9, received deadbee/,
    );
  });
});

test("checkHealth does not echo a secret-like backend revision", async () => {
  await withServer((request, response) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(
      request.url === "/api/v1/health/live"
        ? '{"data":{"ok":true,"revision":"token=secret"}}'
        : '{"data":{"ok":true}}',
    );
  }, async (apiBaseUrl) => {
    await assert.rejects(
      checkHealth(apiBaseUrl, "preflight", "e40aba9"),
      (error) => {
        assert.match(error.message, /Backend revision invalid at/);
        assert.doesNotMatch(error.message, /token|secret/);
        return true;
      },
    );
  });
});

test("checkHealth rejects unavailable or malformed readiness without exposing its body", async () => {
  await withServer((request, response) => {
    if (request.url === "/api/v1/health/ready") {
      response.writeHead(503, { "content-type": "application/json" });
      response.end('{"message":"database password"}');
      return;
    }

    response.writeHead(200, { "content-type": "application/json" });
    response.end('{"data":{"ok":true,"revision":"e40aba9"}}');
  }, async (apiBaseUrl) => {
    await assert.rejects(
      checkHealth(apiBaseUrl, "preflight", "e40aba9"),
      (error) => {
        assert.match(error.message, /Readiness checkpoint failed \(preflight\):/);
        assert.ok(error.message.includes(`${apiBaseUrl}/health/ready`));
        assert.doesNotMatch(error.message, /database password/);
        return true;
      },
    );
  });
});

for (const { endpoint, label, path } of [
  {
    endpoint: "/api/v1/health/live",
    label: "Liveness",
    path: "/health/live",
  },
  {
    endpoint: "/api/v1/health/ready",
    label: "Readiness",
    path: "/health/ready",
  },
]) {
  test(`checkHealth does not retain malformed ${label} response contents`, async () => {
    const secretResponse = "database-password";

    await withServer((request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        request.url === endpoint
          ? secretResponse
          : '{"data":{"ok":true,"revision":"e40aba9"}}',
      );
    }, async (apiBaseUrl) => {
      await assert.rejects(
        checkHealth(apiBaseUrl, "preflight", "e40aba9"),
        (error) => {
          assert.match(
            error.message,
            new RegExp(`${label} checkpoint failed \\(preflight\\): .*${path.replace("/", "\\/")}: invalid JSON response`),
          );

          const loggableError = [
            error.message,
            error.stack,
            error.cause?.message,
            error.cause?.stack,
            JSON.stringify(error, Object.getOwnPropertyNames(error)),
          ].join("\n");
          assert.doesNotMatch(loggableError, /database-password/);
          return true;
        },
      );
    });
  });
}

test("runtime URL validation rejects credentials, query, fragment, and wrong API paths", () => {
  for (const value of [
    "http://user:password@localhost:3001/api/v1",
    "http://localhost:3001/api/v1?token=secret",
    "http://localhost:3001/api/v1#secret",
    "ftp://localhost:3001/api/v1",
    "http://localhost:3001/api/v2",
  ]) {
    assert.throws(() => normalizeApiBaseUrl(value), /Invalid API base URL/);
  }
  assert.equal(
    normalizeApiBaseUrl("http://localhost:3001/api/v1/"),
    "http://localhost:3001/api/v1",
  );
  assert.equal(normalizeWebBaseUrl("http://localhost:3010/"), "http://localhost:3010");
});

test("URL validation errors do not echo credential or query secrets", () => {
  for (const secretUrl of [
    "http://user:password@localhost:3001/api/v1",
    "http://localhost:3001/api/v1?token=secret",
  ]) {
    assert.throws(
      () => normalizeApiBaseUrl(secretUrl),
      (error) => {
        assert.doesNotMatch(error.message, /password|secret/);
        return true;
      },
    );
  }
});

test("resolveExpectedRevision uses an explicit SHA or current worktree HEAD", () => {
  assert.equal(resolveExpectedRevision("e40aba9"), "e40aba9");
  assert.equal(
    resolveExpectedRevision(undefined, () => "d329f3cecada42155424a7ec8a5de23336d39111\n"),
    "d329f3cecada42155424a7ec8a5de23336d39111",
  );
});

test("runAcceptance orders preflight before the runtime journey and remaining suite", async () => {
  const events = [];
  await runAcceptance(
    { apiBaseUrl: "http://localhost:3001/api/v1", expectedRevision: "e40aba9" },
    {
      checkHealth: async (_url, phase) => events.push(phase),
      runRuntimeJourney: async () => {
        events.push("authenticate");
        events.push("after authentication setup");
        events.push("navigate Groups/Funds");
        events.push("after Groups/Funds navigation");
      },
      runRemainingSuite: async () => events.push("remaining suite"),
    },
  );
  assert.deepEqual(events, [
    "before browser tests",
    "authenticate",
    "after authentication setup",
    "navigate Groups/Funds",
    "after Groups/Funds navigation",
    "remaining suite",
  ]);
});

test("Playwright command uses the Node executable and resolved CLI module", () => {
  const command = createPlaywrightCommand(["e2e/runtime-acceptance.spec.ts"]);
  assert.equal(command.executable, process.execPath);
  assert.match(command.args[0], /playwright.*cli\.js$/i);
  assert.deepEqual(command.args.slice(1), [
    "test",
    "e2e/runtime-acceptance.spec.ts",
  ]);
});

test("waitForChild rejects spawn errors and cleans listeners once", async () => {
  const child = new EventEmitter();
  const result = waitForChild(child);
  child.emit("error", new Error("spawn failed"));
  child.emit("exit", 0, null);
  await assert.rejects(result, /spawn failed/);
  assert.equal(child.listenerCount("error"), 0);
  assert.equal(child.listenerCount("exit"), 0);
});

test("waitForChild reports nonzero exits and signals", async () => {
  const nonzero = new EventEmitter();
  const nonzeroResult = waitForChild(nonzero);
  nonzero.emit("exit", 2, null);
  await assert.rejects(nonzeroResult, /exit code 2/);

  const signaled = new EventEmitter();
  const signaledResult = waitForChild(signaled);
  signaled.emit("exit", null, "SIGTERM");
  await assert.rejects(signaledResult, /signal SIGTERM/);
});
