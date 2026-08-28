import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workflow = await readFile(
  new URL("../.github/workflows/ci.yml", import.meta.url),
  "utf8",
);

test("CI pins third-party actions and keeps repository permissions read-only", () => {
  assert.match(workflow, /^permissions:\s*\n\s+contents: read$/m);
  assert.doesNotMatch(workflow, /uses:\s+[^\s]+@v\d+(?:\s|$)/m);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}\s+# v4\.2\.2/);
  assert.match(workflow, /actions\/setup-node@[0-9a-f]{40}\s+# v4\.4\.0/);
  assert.match(workflow, /node --test scripts\/verify-ci-workflow\.test\.mjs/);
});

test("CI gates active Mimic naming and the full backend HTTP baseline", () => {
  assert.match(workflow, /^\s{2}naming:$/m);
  assert.match(workflow, /node --test scripts\/verify-mimic-naming\.test\.mjs/);
  assert.match(workflow, /node scripts\/verify-mimic-naming\.mjs/);
  assert.match(workflow, /JWT_ACCESS_SECRET:/);
  assert.match(workflow, /JWT_REFRESH_SECRET:/);
  assert.match(workflow, /npm run test:e2e -- --runInBand/);
});

test("CI builds all production images and checks their static contracts", () => {
  assert.match(workflow, /^\s{2}containers:$/m);
  assert.match(workflow, /node --test scripts\/verify-production-images\.test\.mjs/);
  assert.match(workflow, /docker build -f backend\/Dockerfile backend -t mimic-api:ci/);
  assert.match(workflow, /--build-arg MIMIC_API_BASE_URL=http:\/\/127\.0\.0\.1:3000\/api\/v1/);
  assert.match(workflow, /-f web\/Dockerfile web -t mimic-web:ci/);
  assert.match(workflow, /docker build -f ops\/backup\/Dockerfile ops\/backup -t mimic-backup:ci/);
  assert.doesNotMatch(workflow, /SENTRY_AUTH_TOKEN/);
});

test("CI exercises backup behavior and POSIX syntax on Linux", () => {
  assert.match(workflow, /node --test ops\/backup\/backup-contract\.test\.mjs/);
  assert.match(workflow, /docker run --rm --entrypoint \/bin\/sh mimic-backup:ci -n \/opt\/mimic\/backup\.sh/);
  assert.match(workflow, /docker run --rm --entrypoint \/bin\/sh mimic-backup:ci -n \/opt\/mimic\/restore-drill\.sh/);
  assert.match(workflow, /docker run --rm --entrypoint \/bin\/sh mimic-backup:ci -n \/opt\/mimic\/restore-entrypoint\.sh/);
});
