import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const WEB_ROOT = fileURLToPath(new URL("..", import.meta.url));
const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";
const DEFAULT_WEB_BASE_URL = "http://localhost:3010";
const REVISION_PATTERN = /^[0-9a-f]{7,64}$/i;

function requireValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
}

function normalizeRuntimeUrl(value, kind, expectedPath) {
  const message = `Invalid ${kind} base URL: expected an HTTP(S) origin${expectedPath} with no credentials, query, or fragment`;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(message);
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    path !== expectedPath
  ) {
    throw new Error(message);
  }

  return `${url.origin}${expectedPath === "/" ? "" : expectedPath}`;
}

export function normalizeApiBaseUrl(value) {
  return normalizeRuntimeUrl(value, "API", "/api/v1");
}

export function normalizeWebBaseUrl(value) {
  return normalizeRuntimeUrl(value, "Web", "/");
}

export function parseArgs(args) {
  const options = {
    apiBaseUrl: DEFAULT_API_BASE_URL,
    expectedRevision: process.env.MIMIC_EXPECTED_BACKEND_REVISION,
    healthOnly: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--health-only") {
      options.healthOnly = true;
    } else if (argument === "--base-url") {
      options.apiBaseUrl = requireValue(args, index, argument);
      index += 1;
    } else if (argument === "--expected-revision") {
      options.expectedRevision = requireValue(args, index, argument);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  options.apiBaseUrl = normalizeApiBaseUrl(options.apiBaseUrl);
  return options;
}

export function resolveExpectedRevision(
  explicitRevision,
  readHead = () => execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: WEB_ROOT,
    encoding: "utf8",
  }),
) {
  const revision = (explicitRevision ?? readHead()).trim();
  if (!REVISION_PATTERN.test(revision)) {
    throw new Error(
      "Invalid expected backend revision: expected a 7-64 character hexadecimal git SHA",
    );
  }
  return revision;
}

export async function checkHealth(
  apiBaseUrl,
  checkpoint,
  expectedRevision,
  { timeoutMs = 5_000, log = console.log } = {},
) {
  const normalizedApiBaseUrl = normalizeApiBaseUrl(apiBaseUrl);
  const liveUrl = `${normalizedApiBaseUrl}/health/live`;
  const readyUrl = `${normalizedApiBaseUrl}/health/ready`;
  const liveBody = await fetchHealthCheckpoint(
    liveUrl,
    checkpoint,
    "Liveness",
    timeoutMs,
  );

  const revision = liveBody?.data?.revision;
  if (!revision) {
    throw new Error(
      `Backend revision missing at ${liveUrl}; expected ${expectedRevision}`,
    );
  }
  if (!REVISION_PATTERN.test(revision)) {
    throw new Error(`Backend revision invalid at ${liveUrl}`);
  }
  if (revision !== expectedRevision) {
    throw new Error(
      `Backend revision mismatch at ${liveUrl}: expected ${expectedRevision}, received ${revision}`,
    );
  }

  const readyBody = await fetchHealthCheckpoint(
    readyUrl,
    checkpoint,
    "Readiness",
    timeoutMs,
  );
  if (readyBody?.data?.ok !== true) {
    throw new Error(
      `Readiness checkpoint failed (${checkpoint}): ${readyUrl}: invalid readiness response`,
    );
  }

  log(`Health checkpoint passed (${checkpoint}): ${liveUrl} and ${readyUrl}`);
  return { liveUrl, readyUrl, revision };
}

async function fetchHealthCheckpoint(url, checkpoint, label, timeoutMs) {
  let response;
  try {
    response = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (cause) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    throw new Error(
      `${label} checkpoint failed (${checkpoint}): ${url}${detail}`,
      { cause },
    );
  }

  if (!response.ok) {
    throw new Error(
      `${label} checkpoint failed (${checkpoint}): ${url}: ${response.status} ${response.statusText}`,
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (cause) {
    throw new Error(
      `${label} checkpoint failed (${checkpoint}): ${url}: invalid JSON response`,
      { cause },
    );
  }

  return body;
}

export function createPlaywrightCommand(files) {
  return {
    executable: process.execPath,
    args: [require.resolve("@playwright/test/cli"), "test", ...files],
  };
}

export function waitForChild(child) {
  return new Promise((resolvePromise, rejectPromise) => {
    let settled = false;
    const cleanup = () => {
      child.off("error", onError);
      child.off("exit", onExit);
    };
    const settle = (callback) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };
    const onError = (error) => settle(() => rejectPromise(error));
    const onExit = (code, signal) => settle(() => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(
          new Error(
            `Playwright failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
          ),
        );
      }
    });

    child.once("error", onError);
    child.once("exit", onExit);
  });
}

function runPlaywright(files, environment) {
  const command = createPlaywrightCommand(files);
  const child = spawn(command.executable, command.args, {
    cwd: WEB_ROOT,
    env: environment,
    stdio: "inherit",
  });
  return waitForChild(child);
}

async function remainingSpecs() {
  const directory = fileURLToPath(new URL("../e2e", import.meta.url));
  return (await readdir(directory))
    .filter(
      (name) =>
        name.endsWith(".spec.ts") && name !== "runtime-acceptance.spec.ts",
    )
    .sort()
    .map((name) => `e2e/${name}`);
}

function acceptanceEnvironment(apiBaseUrl, webBaseUrl, expectedRevision) {
  const environment = { ...process.env };
  delete environment.MIMIC_BACKEND_REVISION;
  return {
    ...environment,
    MIMIC_API_BASE_URL: apiBaseUrl,
    MIMIC_EXPECTED_BACKEND_REVISION: expectedRevision,
    MIMIC_RUNTIME_ACCEPTANCE: "1",
    PLAYWRIGHT_BASE_URL: webBaseUrl,
  };
}

export async function runAcceptance(options, dependencies) {
  const check = dependencies.checkHealth;
  await check(
    options.apiBaseUrl,
    "before browser tests",
    options.expectedRevision,
  );
  if (options.healthOnly) return;
  await dependencies.runRuntimeJourney();
  await dependencies.runRemainingSuite();
}

export async function main(args = process.argv.slice(2)) {
  const parsed = parseArgs(args);
  const expectedRevision = resolveExpectedRevision(parsed.expectedRevision);
  const webBaseUrl = normalizeWebBaseUrl(
    process.env.PLAYWRIGHT_BASE_URL ??
      process.env.MIMIC_WEB_BASE_URL ??
      DEFAULT_WEB_BASE_URL,
  );
  const options = { ...parsed, expectedRevision, webBaseUrl };
  const environment = acceptanceEnvironment(
    options.apiBaseUrl,
    webBaseUrl,
    expectedRevision,
  );

  console.log(`Web root: ${webBaseUrl}`);
  console.log(`API root: ${options.apiBaseUrl}`);
  await runAcceptance(options, {
    checkHealth,
    runRuntimeJourney: () =>
      runPlaywright(
        ["e2e/runtime-acceptance.spec.ts", "--project=desktop"],
        environment,
      ),
    runRemainingSuite: async () =>
      runPlaywright(await remainingSpecs(), environment),
  });
}

const isEntryPoint =
  process.argv[1] &&
  import.meta.url.toLowerCase() ===
    pathToFileURL(resolve(process.argv[1])).href.toLowerCase();

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
