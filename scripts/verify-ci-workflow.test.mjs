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

const backupRuntimeStepName = "Verify PostgreSQL 18 backup runtime";
const expectedBackupRuntimeRun = [
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

function backupRuntimeStep(workflow) {
  const steps = workflow.jobs.containers.steps;
  const existing = steps.find((step) => step.name === backupRuntimeStepName);
  if (existing) return existing;

  const fallback = { name: backupRuntimeStepName, run: expectedBackupRuntimeRun };
  steps.push(fallback);
  return fallback;
}

function backupRuntimeWorkflow(mutate) {
  const workflow = parseWorkflowYaml(workflowSource);
  const step = backupRuntimeStep(workflow);
  mutate(workflow, step);
  return workflow;
}

function assertBackupRuntimeRejects(mutate, message) {
  const workflow = backupRuntimeWorkflow(mutate);
  assert.throws(() => validateCiWorkflow(workflow), message);
}

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

test("the parsed CI workflow defines an isolated PostgreSQL 18 backup runtime step", () => {
  const workflow = parseWorkflowYaml(workflowSource);
  const step = workflow.jobs.containers.steps.find(
    (candidate) => candidate.name === backupRuntimeStepName,
  );
  assert.ok(step);
  assert.deepEqual(Object.keys(step).sort(), ["name", "run"]);
  assert.equal(
    step.run.endsWith("\n") ? step.run.slice(0, -1) : step.run,
    expectedBackupRuntimeRun,
  );
});

test("container CI rejects PostgreSQL 16 backup runtime checks", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace(
        'test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "18"',
        'test "$MIMIC_POSTGRES_CLIENT_MAJOR" = "16"',
      );
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a missing PostgreSQL restore client runtime check", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace(
        '  pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 18\\."\n',
        "",
      );
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects missing fail-fast backup runtime checks", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace("  set -eu", "  set -u");
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects comment continuations before backup runtime checks", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace(
        "  set -eu",
        ["  # \\", "  set -eu"].join("\n"),
      );
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a PostgreSQL 16 pg_dump runtime check", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace(
        'pg_dump --version | grep -Eq "^pg_dump \\(PostgreSQL\\) 18\\."',
        'pg_dump --version | grep -Eq "^pg_dump \\(PostgreSQL\\) 16\\."',
      );
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a PostgreSQL 17 pg_restore runtime check", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace(
        'pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 18\\."',
        'pg_restore --version | grep -Eq "^pg_restore \\(PostgreSQL\\) 17\\."',
      );
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects an early-success command before the backup runtime gate", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = ["exit 0", step.run].join("\n");
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects disabling fail-fast backup runtime checks", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run.replace("  set -eu", "  set -eu\n  set +e");
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects an outer false conditional around the backup runtime gate", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = ["if false; then", step.run, "fi"].join("\n");
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a backup runtime function that is never called", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = ["verify_backup_runtime() {", step.run, "}"].join("\n");
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a conditional dedicated backup runtime step", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.if = "false";
    },
    /Verify PostgreSQL 18 backup runtime must have only name and run/,
  );
});

test("container CI rejects a tolerated dedicated backup runtime failure", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step["continue-on-error"] = true;
    },
    /Verify PostgreSQL 18 backup runtime must have only name and run/,
  );
});

test("container CI rejects an unexpected dedicated backup runtime shell", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.shell = "bash";
    },
    /Verify PostgreSQL 18 backup runtime must have only name and run/,
  );
});

test("container CI rejects ignoring backup runtime failures", () => {
  assertBackupRuntimeRejects(
    (_workflow, step) => {
      step.run = step.run + " || true";
    },
    /Verify PostgreSQL 18 backup runtime must run the exact backup runtime script/,
  );
});

test("container CI rejects a conditional containers job", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.if = "false";
    },
    /containers job must not define an if condition/,
  );
});

test("container CI rejects a tolerated containers job failure", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers["continue-on-error"] = true;
    },
    /containers job must use only name, runs-on, timeout-minutes, and steps/,
  );
});

test("container CI rejects a custom inherited containers shell", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.defaults = {
        run: { shell: "bash -c 'exit 0' -- {0}" },
      };
    },
    /containers job must use only name, runs-on, timeout-minutes, and steps/,
  );
});

test("container CI rejects a custom inherited top-level shell", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.defaults = { run: { shell: "bash -c 'exit 0' -- {0}" } };
    },
    /top-level defaults are not allowed/,
  );
});

test("container CI rejects a top-level shell environment override", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.env = { BASH_ENV: "/tmp/ignore-backup-runtime.sh" };
    },
    /top-level env is not allowed/,
  );
});

test("container CI rejects a containers job shell environment override", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.env = {
        BASH_ENV: "/tmp/ignore-backup-runtime.sh",
      };
    },
    /containers job must use only name, runs-on, timeout-minutes, and steps/,
  );
});

test("container CI rejects an arbitrary unexpected containers job key", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.strategy = {};
    },
    /containers job must use only name, runs-on, timeout-minutes, and steps/,
  );
});

test("container CI rejects run commands that modify later shell environments", () => {
  for (const environmentFile of ["GITHUB_ENV", "GITHUB_PATH", "BASH_ENV"]) {
    assertBackupRuntimeRejects(
      (workflow) => {
        const buildStep = workflow.jobs.containers.steps.find(
          (step) => step.name === "Build backup image",
        );
        assert.ok(buildStep);
        buildStep.run += "\nprintf '%s\n' ignored >> \"$" + environmentFile + "\"";
      },
      /container CI run commands must not write to GITHUB_ENV, GITHUB_PATH, or BASH_ENV/,
    );
  }
});

test("container CI rejects duplicate dedicated backup runtime steps", () => {
  assertBackupRuntimeRejects(
    (workflow, step) => {
      workflow.jobs.containers.steps.push({ ...step });
    },
    /containers must define exactly one Verify PostgreSQL 18 backup runtime step/,
  );
});

test("container CI rejects a missing dedicated backup runtime step", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.steps = workflow.jobs.containers.steps.filter(
        (step) => step.name !== backupRuntimeStepName,
      );
    },
    /containers must define exactly one Verify PostgreSQL 18 backup runtime step/,
  );
});
