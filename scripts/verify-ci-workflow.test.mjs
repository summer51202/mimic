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
  smokeStep.run = smokeStep.run.replaceAll("18", "16");

  assert.throws(
    () => validateCiWorkflow(staleWorkflow),
    /containers must run .*18/,
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
    "pg_restore --version",
    "restore-client --version",
  );

  assert.throws(
    () => validateCiWorkflow(incompleteWorkflow),
    /containers must run pg_restore --version/,
  );
});
