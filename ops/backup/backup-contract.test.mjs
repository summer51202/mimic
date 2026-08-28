import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");

test("backup encrypts before upload without shell tracing or predictable temp files", async () => {
  const script = await read("./backup.sh");

  assert.match(script, /^set -eu$/m);
  assert.doesNotMatch(script, /set\s+-[^\n]*x/);
  assert.match(script, /^umask 077$/m);
  assert.match(script, /mktemp -d/);
  assert.match(script, /^trap cleanup EXIT$/m);
  assert.match(script, /^trap 'exit 1' HUP INT TERM$/m);
  assert.match(script, /pg_dump/);
  assert.match(script, /age --recipient/);
  assert.match(script, /sha256sum/);
  assert.match(script, /aws --endpoint-url/);

  const encryptAt = script.indexOf("age --recipient");
  const removePlainAt = script.indexOf('rm -f "$plain"');
  const uploadAt = script.indexOf("aws --endpoint-url");
  assert.ok(encryptAt >= 0 && encryptAt < removePlainAt);
  assert.ok(removePlainAt < uploadAt);
});

test("backup validates the S3 destination and writes only encrypted artifacts", async () => {
  const script = await read("./backup.sh");

  assert.match(script, /MIMIC_BACKUP_S3_ENDPOINT/);
  assert.match(script, /MIMIC_BACKUP_S3_BUCKET/);
  assert.match(script, /weekly\/\$\{base\}\.age/);
  assert.doesNotMatch(script, /s3 cp[^\n]*\$plain/);
  assert.doesNotMatch(
    script,
    /printf[^\n]*\$(?:DATABASE_URL|AWS_SECRET_ACCESS_KEY|MIMIC_BACKUP_AGE_RECIPIENT)/,
  );
});

test("restore verifies checksum before decrypting and validates before cleanup restore", async () => {
  const script = await read("./restore-drill.sh");

  assert.match(script, /^set -eu$/m);
  assert.doesNotMatch(script, /set\s+-[^\n]*x/);
  assert.match(script, /^umask 077$/m);
  assert.match(script, /mktemp -d/);
  assert.match(script, /^trap cleanup EXIT$/m);
  assert.match(script, /^trap 'exit 1' HUP INT TERM$/m);
  assert.match(script, /MIMIC_RESTORE_CONFIRM/);
  assert.match(script, /MIMIC_RESTORE_DATABASE_NAME/);
  assert.match(script, /SELECT current_database\(\)/);
  assert.match(script, /_restore_drill/);

  const checksumAt = script.indexOf("sha256sum --check");
  const decryptAt = script.indexOf("age --decrypt");
  const guardAt = script.indexOf("SELECT current_database()");
  const restoreAt = script.indexOf("pg_restore --exit-on-error");
  assert.ok(checksumAt >= 0 && checksumAt < decryptAt);
  assert.ok(guardAt >= 0 && guardAt < restoreAt);
  assert.match(script, /--clean --if-exists/);
  assert.match(script, /verify-restore\.sql/);
});

test("restore accepts only canonical weekly encrypted backup object names", async () => {
  const script = await read("./restore-drill.sh");

  assert.match(script, /weekly\/mimic-/);
  assert.match(script, /Refusing invalid backup object/);
  assert.doesNotMatch(script, /basename\s+["']?\$MIMIC_BACKUP_OBJECT/);
});

test("backup image is pinned, unprivileged, and contains syntax-checkable tools", async () => {
  const dockerfile = await read("./Dockerfile");

  assert.match(dockerfile, /^FROM alpine:3\.22\.\d+$/m);
  assert.match(dockerfile, /apk add --no-cache age aws-cli postgresql16-client/);
  assert.match(dockerfile, /^RUN addgroup -S mimic && adduser -S -G mimic mimic$/m);
  assert.match(dockerfile, /^USER mimic$/m);
  assert.match(dockerfile, /^COPY --chown=mimic:mimic /m);
  assert.match(dockerfile, /^CMD \["\/opt\/mimic\/backup\.sh"\]$/m);
  assert.doesNotMatch(dockerfile, /(?:ENV|ARG)\s+.*(?:SECRET|PASSWORD|DATABASE_URL|AGE_IDENTITY)/i);
});

test("POSIX scripts stay LF-only when checked out on Windows", async () => {
  const attributes = await readFile(
    new URL("../../.gitattributes", import.meta.url),
    "utf8",
  );

  assert.match(attributes, /^\/ops\/backup\/\*\.sh text eol=lf$/m);
});

test("restore verification records migrations and exact public table counts", async () => {
  const sql = await read("./verify-restore.sql");

  assert.match(sql, /current_database\(\)/);
  assert.match(sql, /"_prisma_migrations"/);
  assert.match(sql, /finished_at IS NOT NULL/);
  assert.match(sql, /rolled_back_at IS NULL/);
  assert.match(sql, /COUNT\(\*\)::bigint AS row_count/);
  assert.match(sql, /\\gexec/);
});
