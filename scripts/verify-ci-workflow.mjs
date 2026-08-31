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

  const requiredJobs = ["naming", "backend", "web", "containers"];
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
  invariant(references.length === 8, "expected checkout and setup-node in all four jobs");

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
