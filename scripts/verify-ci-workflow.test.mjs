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
