import { createHash } from "node:crypto";
import { createRequire } from "node:module";

const requireFromWeb = createRequire(
  new URL("../web/package.json", import.meta.url),
);
const { load } = requireFromWeb("js-yaml");

const externalActionPattern =
  /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.\/-]+)?@([0-9a-f]{40})$/i;
const localActionRoot = "./.github/actions/";
const localActionSegmentPattern = /^[A-Za-z0-9_.-]+$/;
const allowedContainersJobKeys = ["name", "runs-on", "steps", "timeout-minutes"];
// Any containers-job change requires intentionally reviewing and updating this hash.
const reviewedContainersJobHash =
  "20b46e9c2e7d4c6b03c6b655ca1399a0d68898a6be2d0f4cf07456c4b49ebfa4";
const backupRuntimeStepName = "Verify PostgreSQL 18 backup runtime";
const backupRuntimeExpectedRun = [
  "docker run --rm --entrypoint /bin/sh mimic-backup:ci -c '",
  "  set -eu",
  '  test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"',
  '  pg_dump --version | grep -Eq "^pg_dump \\(PostgreSQL\\) 18\\."',
  '  pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 18\\."',
  "  age --version",
  "  command -v minisign",
  "  aws --version",
  "'",
].join("\n");

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function isMapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isAllowedLocalAction(reference) {
  if (!reference.startsWith(localActionRoot)) return false;
  const segments = reference.slice(localActionRoot.length).split("/");
  return (
    segments.length > 0 &&
    segments.every(
      (segment) =>
        segment !== "." &&
        segment !== ".." &&
        localActionSegmentPattern.test(segment),
    )
  );
}

function visitMappings(value, visitor, path = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      visitMappings(item, visitor, [...path, index]),
    );
    return;
  }
  if (!isMapping(value)) return;

  visitor(value, path);
  for (const [key, child] of Object.entries(value)) {
    visitMappings(child, visitor, [...path, key]);
  }
}

export function parseWorkflowYaml(source) {
  const workflow = load(source, { json: false });
  invariant(isMapping(workflow), "workflow must parse to a top-level mapping");
  return workflow;
}

export function collectActionReferences(document) {
  const references = [];
  visitMappings(document, (mapping, path) => {
    if (!Object.hasOwn(mapping, "uses")) return;
    invariant(
      typeof mapping.uses === "string",
      `uses at ${path.join(".") || "<root>"} must be a string`,
    );
    references.push({ reference: mapping.uses, step: mapping, path });
  });
  return references;
}

export function validateActionReferences(document) {
  const references = collectActionReferences(document);
  for (const { reference } of references) {
    if (reference.startsWith("./")) {
      invariant(
        isAllowedLocalAction(reference),
        `${reference} is not an allowed local action path`,
      );
      continue;
    }
    invariant(
      externalActionPattern.test(reference),
      `${reference} must use a full 40-character commit SHA`,
    );
  }
  return references;
}

function runCommands(job) {
  invariant(Array.isArray(job.steps), "job steps must be a sequence");
  return job.steps
    .map((step) => step?.run)
    .filter((command) => typeof command === "string");
}

function requireCommand(jobName, commands, expected) {
  invariant(
    commands.some((command) => command.includes(expected)),
    `${jobName} must run ${expected}`,
  );
}

function containersJobHash(job) {
  return createHash("sha256").update(JSON.stringify(job)).digest("hex");
}

function validateBackupRuntimeStep(job) {
  invariant(Array.isArray(job.steps), "containers job steps must be a sequence");
  const backupSteps = job.steps.filter(
    (step) => step?.name === backupRuntimeStepName,
  );
  invariant(
    backupSteps.length === 1,
    "containers must define exactly one " + backupRuntimeStepName + " step",
  );
  const backupStep = backupSteps[0];
  invariant(
    Object.keys(backupStep).length === 2 &&
      Object.hasOwn(backupStep, "name") &&
      Object.hasOwn(backupStep, "run"),
    backupRuntimeStepName + " must have only name and run",
  );
  invariant(
    typeof backupStep.run === "string",
    backupRuntimeStepName + " run must be a string",
  );
  const normalizedRun = backupStep.run.replaceAll("\r\n", "\n");
  const runWithoutOptionalTrailingNewline = normalizedRun.endsWith("\n")
    ? normalizedRun.slice(0, -1)
    : normalizedRun;
  invariant(
    runWithoutOptionalTrailingNewline === backupRuntimeExpectedRun,
    backupRuntimeStepName + " must run the exact backup runtime script",
  );
}

const backendDatabaseJobName = "backend-db";
const allowedBackendDatabaseJobKeys = [
  "defaults",
  "env",
  "name",
  "runs-on",
  "services",
  "steps",
  "timeout-minutes",
];
const postgresServiceImagePattern = /^postgres:18(?:\.\d+)?@sha256:[0-9a-f]{64}$/;
const postgresServicePort = "127.0.0.1:5432:5432";
const migrationOnlyDatabasePath = "/mimic_migration_only_test";
const spacesDatabasePath = "/mimic_financial_spaces_test";
const backendDatabaseRunCommands = [
  "npm ci",
  "npm run prisma:generate",
  "npm run prisma:migrate:deploy",
  "npm run test:migration-only-db",
  "npm run prisma:migrate:deploy",
  "npm run test:spaces-db",
];
const backendDatabaseStepKeys = ["env", "name", "run"];

function assertLoopbackDatabaseUrl(raw, expectedPath, label) {
  invariant(typeof raw === "string", `${label} must set DATABASE_URL`);
  invariant(!raw.includes("${{"), `${label} DATABASE_URL must not use expressions`);
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label} DATABASE_URL must be a valid URL`);
  }
  invariant(
    url.protocol === "postgresql:" &&
      url.hostname === "127.0.0.1" &&
      url.port === "5432" &&
      url.pathname === expectedPath,
    `${label} DATABASE_URL must target 127.0.0.1:5432${expectedPath}`,
  );
}

function validateBackendDatabaseJob(job) {
  const label = backendDatabaseJobName;
  const keys = Object.keys(job).sort();
  invariant(
    keys.length === allowedBackendDatabaseJobKeys.length &&
      keys.every((key, index) => key === allowedBackendDatabaseJobKeys[index]),
    `${label} job must use only name, runs-on, timeout-minutes, services, env, defaults, and steps`,
  );
  invariant(
    !JSON.stringify(job).includes("secrets."),
    `${label} job must not read repository secrets`,
  );

  invariant(
    isMapping(job.env) &&
      Object.keys(job.env).sort().join(",") ===
        "JWT_ACCESS_SECRET,JWT_REFRESH_SECRET",
    `${label} job env must set only the JWT CI values`,
  );
  invariant(
    isMapping(job.defaults) &&
      Object.keys(job.defaults).join(",") === "run" &&
      isMapping(job.defaults.run) &&
      Object.keys(job.defaults.run).join(",") === "working-directory" &&
      job.defaults.run["working-directory"] === "backend",
    `${label} job defaults must only set working-directory: backend`,
  );

  invariant(
    isMapping(job.services) &&
      Object.keys(job.services).join(",") === "postgres",
    `${label} job must define only a postgres service`,
  );
  const postgres = job.services.postgres;
  invariant(
    isMapping(postgres) &&
      Object.keys(postgres).sort().join(",") === "env,image,options,ports",
    `${label} postgres service must use only image, env, ports, and options`,
  );
  invariant(
    typeof postgres.image === "string" &&
      postgresServiceImagePattern.test(postgres.image),
    `${label} postgres service must pin a postgres:18 image by sha256 digest`,
  );
  invariant(
    Array.isArray(postgres.ports) &&
      postgres.ports.length === 1 &&
      postgres.ports[0] === postgresServicePort,
    `${label} postgres service must publish only ${postgresServicePort}`,
  );
  invariant(
    typeof postgres.options === "string" &&
      postgres.options.includes("--health-cmd") &&
      postgres.options.includes("pg_isready"),
    `${label} postgres service must define a pg_isready health check`,
  );
  invariant(
    isMapping(postgres.env) &&
      typeof postgres.env.POSTGRES_USER === "string" &&
      typeof postgres.env.POSTGRES_PASSWORD === "string" &&
      postgres.env.POSTGRES_DB === "postgres",
    `${label} postgres service must use inline CI-only credentials and the default postgres database`,
  );

  invariant(Array.isArray(job.steps), `${label} job steps must be a sequence`);
  const runSteps = job.steps.filter((step) => Object.hasOwn(step ?? {}, "run"));
  invariant(
    runSteps.length === backendDatabaseRunCommands.length &&
      runSteps.every(
        (step, index) => step.run === backendDatabaseRunCommands[index],
      ),
    `${label} job must run exactly: ${backendDatabaseRunCommands.join(" -> ")}`,
  );
  invariant(
    job.steps.length === runSteps.length + 2,
    `${label} job must only add checkout and setup-node around its run steps`,
  );
  for (const step of runSteps) {
    const stepKeys = Object.keys(step).sort();
    invariant(
      stepKeys.every((key) => backendDatabaseStepKeys.includes(key)),
      `${label} run step "${step.name}" must use only name, env, and run`,
    );
  }

  const [, , migrateOnly, testOnly, migrateSpaces, testSpaces] = runSteps;
  invariant(
    !Object.hasOwn(runSteps[0], "env") && !Object.hasOwn(runSteps[1], "env"),
    `${label} install and generate steps must not set env`,
  );
  for (const [step, path] of [
    [migrateOnly, migrationOnlyDatabasePath],
    [testOnly, migrationOnlyDatabasePath],
    [migrateSpaces, spacesDatabasePath],
    [testSpaces, spacesDatabasePath],
  ]) {
    invariant(
      isMapping(step.env) && Object.keys(step.env).join(",") === "DATABASE_URL",
      `${label} step "${step.name}" env must set only DATABASE_URL`,
    );
    assertLoopbackDatabaseUrl(step.env.DATABASE_URL, path, `${label} step "${step.name}"`);
  }
  invariant(
    migrateOnly.env.DATABASE_URL === testOnly.env.DATABASE_URL &&
      migrateSpaces.env.DATABASE_URL === testSpaces.env.DATABASE_URL,
    `${label} must migrate the same database each test suite uses`,
  );
}

export function validateCiWorkflow(workflow) {
  invariant(isMapping(workflow.permissions), "top-level permissions must be a mapping");
  invariant(
    Object.keys(workflow.permissions).length === 1 &&
      workflow.permissions.contents === "read",
    "top-level permissions must grant only contents: read",
  );
  invariant(!Object.hasOwn(workflow, "defaults"), "top-level defaults are not allowed");
  invariant(!Object.hasOwn(workflow, "env"), "top-level env is not allowed");
  invariant(isMapping(workflow.jobs), "jobs must be a mapping");

  const requiredJobs = ["naming", "backend", backendDatabaseJobName, "web", "containers"];
  for (const jobName of requiredJobs) {
    const job = workflow.jobs[jobName];
    invariant(isMapping(job), `missing ${jobName} job`);
    invariant(
      Number.isInteger(job["timeout-minutes"]) &&
        job["timeout-minutes"] >= 1 &&
        job["timeout-minutes"] <= 60,
      `${jobName} must have a timeout between 1 and 60 minutes`,
    );

    const checkoutSteps = job.steps.filter(
      (step) =>
        typeof step?.uses === "string" &&
        step.uses.startsWith("actions/checkout@"),
    );
    invariant(checkoutSteps.length === 1, `${jobName} must check out exactly once`);
    invariant(
      checkoutSteps[0].with?.["persist-credentials"] === false,
      `${jobName} checkout must set persist-credentials: false`,
    );
  }

  const references = validateActionReferences(workflow);
  invariant(
    references.length === requiredJobs.length * 2,
    "expected checkout and setup-node in every required job",
  );

  const namingCommands = runCommands(workflow.jobs.naming);
  requireCommand("naming", namingCommands, "node --test scripts/verify-mimic-naming.test.mjs");
  requireCommand("naming", namingCommands, "node scripts/verify-mimic-naming.mjs");

  const backendCommands = runCommands(workflow.jobs.backend);
  for (const expected of [
    "npm ci",
    "npm run prisma:generate",
    "npm run build",
    "npm test -- --runInBand",
    "npm run test:e2e -- --runInBand",
  ]) {
    requireCommand("backend", backendCommands, expected);
  }
  invariant(
    typeof workflow.jobs.backend.env?.JWT_ACCESS_SECRET === "string" &&
      typeof workflow.jobs.backend.env?.JWT_REFRESH_SECRET === "string",
    "backend CI must set both JWT secrets",
  );

  validateBackendDatabaseJob(workflow.jobs[backendDatabaseJobName]);
  invariant(
    !Object.values(workflow.jobs).some((job) =>
      runCommands(job).some((command) => /\bseed\b|prisma:seed/.test(command)),
    ),
    "CI must never seed a database",
  );

  const webCommands = runCommands(workflow.jobs.web);
  for (const expected of [
    "npm ci",
    "node --test ../scripts/verify-ci-workflow.test.mjs",
    "npm run lint",
    "npm run typecheck",
    "npm test",
    "npm run build",
  ]) {
    requireCommand("web", webCommands, expected);
  }
  invariant(
    workflow.jobs.web.env?.MIMIC_API_BASE_URL ===
      "http://localhost:3000/api/v1",
    "web CI must use the local API base URL",
  );

  const containersJob = workflow.jobs.containers;
  invariant(
    !Object.hasOwn(containersJob, "if"),
    "containers job must not define an if condition",
  );
  const containersJobKeys = Object.keys(containersJob).sort();
  invariant(
    containersJobKeys.length === allowedContainersJobKeys.length &&
      containersJobKeys.every(
        (key, index) => key === allowedContainersJobKeys[index],
      ),
    "containers job must use only name, runs-on, timeout-minutes, and steps",
  );

  const containerCommands = runCommands(containersJob);
  for (const expected of [
    "node --test scripts/verify-production-images.test.mjs",
    "node --test ops/backup/backup-contract.test.mjs",
    "docker build -f backend/Dockerfile backend -t mimic-api:ci",
    "-f web/Dockerfile web -t mimic-web:ci",
    "docker build -f ops/backup/Dockerfile ops/backup -t mimic-backup:ci",
    "docker run --detach",
    "/api/v1/health/live",
    "/api/health/live",
  ]) {
    requireCommand("containers", containerCommands, expected);
  }

  validateBackupRuntimeStep(containersJob);
  invariant(
    containersJobHash(containersJob) === reviewedContainersJobHash,
    "containers execution contract changed and requires review",
  );

  invariant(
    !JSON.stringify(workflow).includes("SENTRY_AUTH_TOKEN"),
    "CI must build without a Sentry auth token",
  );
}
