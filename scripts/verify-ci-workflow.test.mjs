import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
const reviewedContainersJobHash =
  "20b46e9c2e7d4c6b03c6b655ca1399a0d68898a6be2d0f4cf07456c4b49ebfa4";
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

function containersJobHash(workflow) {
  return createHash("sha256")
    .update(JSON.stringify(workflow.jobs.containers))
    .digest("hex");
}

test("the parsed CI workflow satisfies the complete release contract", () => {
  const workflow = parseWorkflowYaml(workflowSource);
  assert.doesNotThrow(() => validateCiWorkflow(workflow));
});

test("web CI generates the backend Prisma client before type-checking real-backend specs", () => {
  const workflow = parseWorkflowYaml(workflowSource);
  const steps = workflow.jobs.web.steps;
  const installAt = steps.findIndex(
    (step) =>
      step.name === "Install backend dependencies for acceptance types" &&
      step["working-directory"] === "backend" &&
      step.run === "npm ci",
  );
  const generateAt = steps.findIndex(
    (step) =>
      step.name === "Generate backend Prisma client for acceptance types" &&
      step["working-directory"] === "backend" &&
      step.run === "npm run prisma:generate",
  );
  const typecheckAt = steps.findIndex((step) => step.name === "Type-check");

  assert.ok(installAt >= 0, "web CI must install backend dependencies");
  assert.ok(generateAt > installAt, "web CI must generate Prisma after installing backend dependencies");
  assert.ok(typecheckAt > generateAt, "web CI must generate Prisma before type-checking");
});

test("the parsed containers job has a deterministic reviewed execution hash", () => {
  const first = parseWorkflowYaml(workflowSource);
  const second = parseWorkflowYaml(workflowSource);
  assert.equal(containersJobHash(first), containersJobHash(second));
  assert.equal(containersJobHash(first), reviewedContainersJobHash);
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

test("container CI rejects an arbitrary extra pre-gate run step", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.steps.unshift({
        name: "Unexpected pre-gate command",
        run: "printf harmless",
      });
    },
    /containers execution contract changed and requires review/,
  );
});

test("container CI rejects an obfuscated pre-gate docker shim", () => {
  assertBackupRuntimeRejects(
    (workflow) => {
      workflow.jobs.containers.steps.unshift({
        name: "Prepare unexpected docker shim",
        run: [
          'fake_dir="$(mktemp -d)"',
          "printf '%s\\n' '#!/bin/sh' 'rm -- \"$0\"' 'exit 0' > \"$fake_dir/docker\"",
          'chmod +x "$fake_dir/docker"',
          'path_name="$(printf \'%s%s\' GITHUB _PATH)"',
          'eval "printf \'%s\\n\' \"$fake_dir\" >> \"\\${$path_name}\""',
        ].join("\n"),
      });
    },
    /containers execution contract changed and requires review/,
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
      /containers execution contract changed and requires review/,
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

// Phase 2I-2T: PostgreSQL-backed backend suites run in a dedicated CI job.
const backendDatabaseStepNames = {
  migrateOnly: "Migrate fresh migration-only database without seed",
  testOnly: "Test migration-only database",
  migrateSpaces: "Migrate fresh financial spaces database",
  testSpaces: "Test financial spaces database",
};

function backendDatabaseWorkflow(mutate) {
  const workflow = parseWorkflowYaml(workflowSource);
  const job = workflow.jobs["backend-db"];
  assert.ok(job, "backend-db job must exist before mutating it");
  mutate(workflow, job);
  return workflow;
}

function backendDatabaseStep(job, key) {
  const step = job.steps.find(
    (candidate) => candidate.name === backendDatabaseStepNames[key],
  );
  assert.ok(step, `missing ${backendDatabaseStepNames[key]}`);
  return step;
}

function withoutStep(job, key) {
  job.steps = job.steps.filter(
    (step) => step.name !== backendDatabaseStepNames[key],
  );
}

function assertBackendDatabaseRejects(mutate, message) {
  const workflow = backendDatabaseWorkflow(mutate);
  assert.throws(() => validateCiWorkflow(workflow), message);
}

test("backend-db runs both PostgreSQL suites on separate fresh loopback databases", () => {
  const workflow = parseWorkflowYaml(workflowSource);
  const job = workflow.jobs["backend-db"];
  assert.equal(job.name, "Backend database");
  assert.match(
    job.services.postgres.image,
    /^postgres:18(?:\.\d+)?@sha256:[0-9a-f]{64}$/,
  );
  assert.deepEqual(job.services.postgres.ports, ["127.0.0.1:5432:5432"]);
  assert.match(job.services.postgres.options, /--health-cmd "pg_isready /);

  const names = job.steps.map((step) => step.name);
  const order = Object.values(backendDatabaseStepNames).map((name) =>
    names.indexOf(name),
  );
  assert.ok(order.every((index) => index >= 0), "all four database steps exist");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "steps are in order");

  const onlyUrl = new URL(backendDatabaseStep(job, "testOnly").env.DATABASE_URL);
  const spacesUrl = new URL(backendDatabaseStep(job, "testSpaces").env.DATABASE_URL);
  assert.equal(onlyUrl.pathname, "/mimic_migration_only_test");
  assert.equal(spacesUrl.pathname, "/mimic_financial_spaces_test");
  assert.equal(onlyUrl.hostname, "127.0.0.1");
  assert.equal(spacesUrl.hostname, "127.0.0.1");
  assert.ok(!JSON.stringify(workflow).includes("secrets."));
});

test("backend-db rejects a workflow without the job", () => {
  assertBackendDatabaseRejects(
    (workflow) => {
      delete workflow.jobs["backend-db"];
    },
    /missing backend-db job/,
  );
});

for (const key of Object.keys(backendDatabaseStepNames)) {
  test(`backend-db rejects removing "${backendDatabaseStepNames[key]}"`, () => {
    assertBackendDatabaseRejects(
      (_workflow, job) => withoutStep(job, key),
      /backend-db job must run exactly/,
    );
  });
}

test("backend-db rejects removing both database test steps", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      withoutStep(job, "testOnly");
      withoutStep(job, "testSpaces");
    },
    /backend-db job must run exactly/,
  );
});

test("backend-db rejects running the migration-only suite before its migration", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      const migrate = backendDatabaseStep(job, "migrateOnly");
      const testStep = backendDatabaseStep(job, "testOnly");
      const a = job.steps.indexOf(migrate);
      const b = job.steps.indexOf(testStep);
      [job.steps[a], job.steps[b]] = [job.steps[b], job.steps[a]];
    },
    /backend-db job must run exactly/,
  );
});

test("backend-db rejects ignoring database test failures", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      backendDatabaseStep(job, "testSpaces").run += " || true";
    },
    /backend-db job must run exactly/,
  );
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      backendDatabaseStep(job, "testOnly")["continue-on-error"] = true;
    },
    /must use only name, env, and run/,
  );
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      backendDatabaseStep(job, "testOnly").if = "false";
    },
    /must use only name, env, and run/,
  );
});

test("backend-db rejects a conditional or tolerated job", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job.if = "false";
    },
    /backend-db job must use only/,
  );
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job["continue-on-error"] = true;
    },
    /backend-db job must use only/,
  );
});

test("backend-db rejects seeding any CI database", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      const at = job.steps.indexOf(backendDatabaseStep(job, "testOnly"));
      job.steps.splice(at, 0, {
        name: "Seed",
        env: { ...backendDatabaseStep(job, "testOnly").env },
        run: "npx prisma db seed",
      });
    },
    /backend-db job must run exactly/,
  );
  assertBackendDatabaseRejects(
    (workflow) => {
      workflow.jobs.backend.steps.push({ name: "Seed", run: "npm run prisma:seed" });
    },
    /CI must never seed a database/,
  );
});

test("backend-db rejects sharing one database between the seeded and unseeded suites", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      for (const key of ["migrateSpaces", "testSpaces"]) {
        backendDatabaseStep(job, key).env.DATABASE_URL =
          backendDatabaseStep(job, "testOnly").env.DATABASE_URL;
      }
    },
    /DATABASE_URL must target 127\.0\.0\.1:5432\/mimic_financial_spaces_test/,
  );
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job.env.DATABASE_URL = backendDatabaseStep(job, "testOnly").env.DATABASE_URL;
    },
    /backend-db job env must set only the JWT CI values/,
  );
});

test("backend-db rejects a non-loopback database URL", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      const step = backendDatabaseStep(job, "testSpaces");
      step.env.DATABASE_URL = step.env.DATABASE_URL.replace("127.0.0.1", "db.example.com");
    },
    /must target 127\.0\.0\.1:5432\/mimic_financial_spaces_test/,
  );
});

test("backend-db rejects an unpinned or non-18 PostgreSQL image", () => {
  for (const image of [
    "postgres:18",
    "postgres:latest",
    "postgres:16@sha256:" + "0".repeat(64),
    "postgres:17.6@sha256:" + "0".repeat(64),
  ]) {
    assertBackendDatabaseRejects(
      (_workflow, job) => {
        job.services.postgres.image = image;
      },
      /must pin a postgres:18 image by sha256 digest/,
    );
  }
});

test("backend-db rejects publishing PostgreSQL beyond the runner loopback", () => {
  for (const ports of [["5432:5432"], ["0.0.0.0:5432:5432"], ["5432"]]) {
    assertBackendDatabaseRejects(
      (_workflow, job) => {
        job.services.postgres.ports = ports;
      },
      /must publish only 127\.0\.0\.1:5432:5432/,
    );
  }
});

test("backend-db rejects a PostgreSQL service without a health check", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job.services.postgres.options = "--shm-size 256m";
    },
    /must define a pg_isready health check/,
  );
});

test("backend-db rejects repository secrets for database credentials", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job.services.postgres.env.POSTGRES_PASSWORD = "${{ secrets.POSTGRES_PASSWORD }}";
    },
    /backend-db job must not read repository secrets/,
  );
});

test("backend-db rejects an extra command that could alter later steps", () => {
  assertBackendDatabaseRejects(
    (_workflow, job) => {
      job.steps.splice(2, 0, {
        name: "Unexpected",
        run: "printf '%s\\n' 'SKIP=1' >> \"$GITHUB_ENV\"",
      });
    },
    /backend-db job must run exactly/,
  );
});
