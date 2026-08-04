import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const DEFAULT_API_BASE_URL = "http://localhost:3001/api/v1";
const DEFAULT_WEB_BASE_URL = "http://localhost:3010";

function requireValue(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value`);
  }
  return value;
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
      options.apiBaseUrl = requireValue(args, index, argument).replace(/\/+$/, "");
      index += 1;
    } else if (argument === "--expected-revision") {
      options.expectedRevision = requireValue(args, index, argument);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  new URL(options.apiBaseUrl);
  return options;
}

export function verifyRevision(expectedRevision, backendRevision) {
  if (!backendRevision) return;
  if (!expectedRevision) {
    throw new Error(
      "MIMIC_BACKEND_REVISION is set, but no expected revision was supplied via --expected-revision or MIMIC_EXPECTED_BACKEND_REVISION",
    );
  }
  if (backendRevision !== expectedRevision) {
    throw new Error(
      `Backend revision mismatch: expected ${expectedRevision}, received ${backendRevision}`,
    );
  }
}

export async function checkHealth(
  apiBaseUrl,
  checkpoint,
  { timeoutMs = 5_000 } = {},
) {
  const healthUrl = `${apiBaseUrl.replace(/\/+$/, "")}/health`;
  try {
    const response = await fetch(healthUrl, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    console.log(`Health checkpoint passed (${checkpoint}): ${healthUrl}`);
    return { healthUrl };
  } catch (cause) {
    const detail = cause instanceof Error ? `: ${cause.message}` : "";
    throw new Error(
      `Health checkpoint failed (${checkpoint}): ${healthUrl}${detail}`,
      { cause },
    );
  }
}

async function establishAuthentication(apiBaseUrl) {
  const registerUrl = `${apiBaseUrl}/auth/register`;
  const suffix = `${Date.now()}-${process.pid}`;
  const response = await fetch(registerUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      display_name: `Runtime acceptance ${suffix}`,
      email: `runtime-${suffix}@example.com`,
      password: "runtime-acceptance-password",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(
      `Authentication setup failed at ${registerUrl}: ${response.status} ${response.statusText}`,
    );
  }
}

function runPlaywright(files, environment) {
  const executable = process.platform === "win32" ? "npx.cmd" : "npx";
  return new Promise((resolve, reject) => {
    const child = spawn(executable, ["playwright", "test", ...files], {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      env: environment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`Playwright failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`));
    });
  });
}

async function remainingSpecs() {
  const directory = fileURLToPath(new URL("../e2e", import.meta.url));
  return (await readdir(directory))
    .filter(
      (name) =>
        name.endsWith(".spec.ts") && name !== "authenticated-navigation.spec.ts",
    )
    .sort()
    .map((name) => `e2e/${name}`);
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  const webBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL ?? process.env.MIMIC_WEB_BASE_URL ?? DEFAULT_WEB_BASE_URL;

  console.log(`Web root: ${webBaseUrl}`);
  console.log(`API root: ${options.apiBaseUrl}`);
  verifyRevision(
    options.expectedRevision,
    process.env.MIMIC_BACKEND_REVISION,
  );
  await checkHealth(options.apiBaseUrl, "before browser tests");
  if (options.healthOnly) return;

  await establishAuthentication(options.apiBaseUrl);
  await checkHealth(options.apiBaseUrl, "after authentication setup");

  const environment = {
    ...process.env,
    MIMIC_API_BASE_URL: options.apiBaseUrl,
    PLAYWRIGHT_BASE_URL: webBaseUrl,
  };
  await runPlaywright(["e2e/authenticated-navigation.spec.ts"], environment);
  await checkHealth(options.apiBaseUrl, "after Groups/Funds navigation");
  await runPlaywright(await remainingSpecs(), environment);
}

const isEntryPoint =
  process.argv[1] &&
  import.meta.url.toLowerCase() === pathToFileURL(resolve(process.argv[1])).href.toLowerCase();

if (isEntryPoint) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
