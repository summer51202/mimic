import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseWorkflowYaml,
  validateActionReferences,
  validateCiWorkflow,
} from "./verify-ci-workflow.mjs";

const workflowSource = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

test("the parsed CI workflow satisfies the complete release contract", () => {
  const workflow = parseWorkflowYaml(workflowSource);
  assert.doesNotThrow(() => validateCiWorkflow(workflow));
});

test("recursive action validation rejects an unpinned flow-mapping action", () => {
  const fixture = parseWorkflowYaml("probe: { nested: [{ uses: owner/action@main }] }");
  assert.throws(
    () => validateActionReferences(fixture),
    /owner\/action@main must use a full 40-character commit SHA/,
  );
});

test("recursive action validation accepts only repository-local action paths", () => {
  const allowed = parseWorkflowYaml("probe: { uses: ./.github/actions/build }");
  assert.doesNotThrow(() => validateActionReferences(allowed));

  const disallowed = parseWorkflowYaml("probe: { uses: ./scripts/build }");
  assert.throws(
    () => validateActionReferences(disallowed),
    /is not an allowed local action path/,
  );

  const traversal = parseWorkflowYaml(
    "probe: { uses: ./.github/actions/../scripts/build }",
  );
  assert.throws(
    () => validateActionReferences(traversal),
    /is not an allowed local action path/,
  );
});

test("container CI rejects PostgreSQL 16 backup runtime checks", () => {
  const staleWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = staleWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /MIMIC_POSTGRES_CLIENT_MAJOR" = "18"/);
  smokeStep.run = smokeStep.run.replace(
    'test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"',
    'test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "16"',
  );

  assert.throws(
    () => validateCiWorkflow(staleWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects a missing PostgreSQL restore client runtime check", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /pg_restore --version/);
  smokeStep.run = smokeStep.run.replace(
    'pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 18\\."\n',
    "",
  );

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI requires fail-fast mode in the backup runtime shell", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*set -eu\n/);
  smokeStep.run = smokeStep.run.replace("set -eu", "set -u");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI requires fail-fast mode before backup runtime checks", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*set -eu\n\s*test "\$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"/);
  smokeStep.run = smokeStep.run.replace(
    /(set -eu\n\s*)(test "\$MIMIC_POSTGRES_CLIENT_MAJOR" = "18")/,
    "$2\n            set -eu",
  );

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects a commented backup runtime shell block", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(
    smokeStep.run,
    /\n\s*docker run --rm --entrypoint \/bin\/sh mimic-backup:ci -c '/,
  );
  smokeStep.run = smokeStep.run.replace(
    "docker run --rm --entrypoint /bin/sh mimic-backup:ci -c '",
    "# docker run --rm --entrypoint /bin/sh mimic-backup:ci -c '",
  );

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must contain the exact backup image shell block/,
  );
});

test("container CI rejects a commented backup runtime requirement", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*age --version\n/);
  smokeStep.run = smokeStep.run.replace("age --version", "# age --version");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects a PostgreSQL 16 pg_dump runtime check", () => {
  const staleWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = staleWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /pg_dump --version/);
  smokeStep.run = smokeStep.run.replace(
    'pg_dump --version | grep -Eq "^pg_dump \\(PostgreSQL\\) 18\\."',
    'pg_dump --version | grep -Eq "^pg_dump \\(PostgreSQL\\) 16\\."',
  );

  assert.throws(
    () => validateCiWorkflow(staleWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects a PostgreSQL 17 pg_restore runtime check", () => {
  const staleWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = staleWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /pg_restore --version/);
  smokeStep.run = smokeStep.run.replace(
    'pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 18\\."',
    'pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 17\\."',
  );

  assert.throws(
    () => validateCiWorkflow(staleWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects an early-success backup runtime command", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*set -eu\n/);
  smokeStep.run = smokeStep.run.replace("set -eu", "set -eu\n            exit 0");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects disabling fail-fast backup runtime checks", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*set -eu\n/);
  smokeStep.run = smokeStep.run.replace("set -eu", "set -eu\n            set +e");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects a backup runtime function that is never called", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*set -eu\n/);
  assert.match(smokeStep.run, /\n\s*'\n$/);
  smokeStep.run = smokeStep.run
    .replace("set -eu", "set -eu\n            verify_backup_runtime() {")
    .replace(/\n(\s*)'\n$/, "\n$1}\n$1'\n");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must exactly match the expected ordered commands/,
  );
});

test("container CI rejects ignoring backup runtime failures", () => {
  const incompleteWorkflow = parseWorkflowYaml(workflowSource);
  const smokeStep = incompleteWorkflow.jobs.containers.steps.find(
    (step) => step.name === "Smoke-check production image runtimes",
  );
  assert.ok(smokeStep);
  assert.equal(typeof smokeStep.run, "string");
  assert.match(smokeStep.run, /\n\s*'\n$/);
  smokeStep.run = smokeStep.run.replace(/\n\s*'\n$/, "\n          ' || true\n");

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers backup runtime contract must contain the exact backup image shell block/,
  );
});
