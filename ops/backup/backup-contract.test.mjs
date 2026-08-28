import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import test from "node:test";

const read = (name) => readFile(new URL(name, import.meta.url), "utf8");
const execFileAsync = promisify(execFile);

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
  assert.match(script, /run_aws --endpoint-url/);

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
  assert.match(script, /\/dev\/urandom/);
  assert.match(script, /MIMIC_BACKUP_MINISIGN_SECRET_KEY/);
  assert.match(script, /minisign -S/);
  assert.match(script, /\.manifest\.minisig/);
  assert.match(script, /source_postgres_version_num=/);
  assert.match(script, /expected_migration=/);
  assert.match(script, /ORDER BY finished_at DESC/);
  assert.match(script, /source_migration.*MIMIC_EXPECTED_MIGRATION/);
  assert.match(script, /release=/);
  assert.doesNotMatch(script, /s3 cp[^\n]*\$plain/);
  assert.doesNotMatch(script, /printf[^\n]*\$(?:AWS_SECRET_ACCESS_KEY|MIMIC_BACKUP_AGE_RECIPIENT)/);
  assert.doesNotMatch(script, /DATABASE_URL/);
  for (const field of ["HOST", "PORT", "USER", "PASSWORD", "NAME", "SSL_MODE"]) {
    assert.match(script, new RegExp(`MIMIC_BACKUP_DATABASE_${field}`));
  }
  assert.match(script, /leading or trailing whitespace/);
  for (const parameter of ["host", "port", "user", "password", "dbname", "sslmode"]) {
    assert.match(script, new RegExp(`printf '${parameter}=%s`));
  }
  assert.ok(script.indexOf('> "$signing_key"') < script.indexOf("psql --dbname"));
  assert.ok(script.indexOf('> "$signing_key"') < script.indexOf("tr -d"));
  assert.ok(script.indexOf("unset MIMIC_BACKUP_MINISIGN_SECRET_KEY") < script.indexOf("tr -d"));
  assert.ok(script.indexOf("unset AWS_ACCESS_KEY_ID") < script.indexOf("tr -d"));
  assert.match(script, /run_aws\(\)/);
  assert.doesNotMatch(script, /^aws --endpoint-url/m);
  assert.ok(script.indexOf("unset AWS_ACCESS_KEY_ID") < script.indexOf("tr -d"));
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
  assert.match(script, /MIMIC_RESTORE_SENTINEL_NONCE/);
  assert.match(script, /MIMIC_PRODUCTION_SYSTEM_IDENTIFIER/);
  assert.match(script, /MIMIC_RESTORE_SYSTEM_IDENTIFIER/);
  assert.match(script, /pg_control_system\(\)/);
  assert.match(script, /obj_description/);
  assert.match(script, /SELECT current_database\(\)/);
  assert.match(script, /_restore_drill/);

  const signatureAt = script.indexOf("minisign -V");
  const checksumAt = script.indexOf("sha256sum --check");
  const decryptAt = script.indexOf("age --decrypt");
  const guardAt = script.indexOf("SELECT current_database()");
  const restoreAt = script.indexOf('pg_restore --dbname="service=${service_name}"');
  assert.ok(signatureAt >= 0 && signatureAt < checksumAt);
  assert.ok(checksumAt < decryptAt);
  assert.ok(guardAt >= 0 && guardAt < restoreAt);
  assert.match(script, /--clean --if-exists/);
  assert.match(script, /verify-restore\.sql/);
  assert.match(script, /pg_service\.conf/);
  assert.match(script, /chmod 0600/);
  assert.doesNotMatch(script, /export PGDATABASE/);
  assert.doesNotMatch(script, /DATABASE_URL/);
  for (const field of ["HOST", "PORT", "USER", "PASSWORD", "NAME", "SSL_MODE"]) {
    assert.match(script, new RegExp(`MIMIC_RESTORE_DATABASE_${field}`));
  }
  assert.match(script, /leading or trailing whitespace/);
  for (const parameter of ["host", "port", "user", "password", "dbname", "sslmode"]) {
    assert.match(script, new RegExp(`printf '${parameter}=%s`));
  }
  assert.match(script, /run_aws\(\)/);
  assert.doesNotMatch(script, /^aws --endpoint-url/m);
  assert.match(
    script,
    /pg_restore[\s\S]*--dbname="service=\$\{service_name\}"/,
  );
});

test("restore accepts only collision-resistant weekly encrypted backup object names", async () => {
  const script = await read("./restore-drill.sh");

  assert.match(script, /weekly\/mimic-/);
  assert.match(script, /[0-9a-f].*dump\.age/);
  assert.match(script, /Refusing invalid backup object/);
  assert.doesNotMatch(script, /basename\s+["']?\$MIMIC_BACKUP_OBJECT/);
});

test("backup image fixes its Alpine release and PostgreSQL major and runs unprivileged", async () => {
  const dockerfile = await read("./Dockerfile");

  assert.match(dockerfile, /^FROM alpine:3\.22\.\d+@sha256:[0-9a-f]{64}$/m);
  assert.match(dockerfile, /^ARG POSTGRES_MAJOR=16$/m);
  assert.match(dockerfile, /apk add --no-cache age aws-cli minisign postgresql\$\{POSTGRES_MAJOR\}-client/);
  assert.match(dockerfile, /^RUN addgroup -g 10001 -S mimic && adduser -u 10001 -S -G mimic mimic$/m);
  assert.match(dockerfile, /^ENV MIMIC_POSTGRES_CLIENT_MAJOR=\$POSTGRES_MAJOR$/m);
  assert.match(dockerfile, /^USER mimic$/m);
  assert.match(dockerfile, /^COPY --chown=mimic:mimic /m);
  assert.match(dockerfile, /restore-entrypoint\.sh/);
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
  assert.match(sql, /expected_migration/);
  assert.match(sql, /expected_release/);
  assert.match(sql, /required_tables_ok/);
  assert.match(sql, /group_members/);
  assert.match(sql, /settlements/);
  assert.match(sql, /\\quit 3/);
});

test("required restore tables match Prisma physical table mappings", async () => {
  const sql = await read("./verify-restore.sql");
  const prisma = await readFile(
    new URL("../../backend/prisma/schema.prisma", import.meta.url),
    "utf8",
  );

  const modelTables = [...prisma.matchAll(/^model\s+(\w+)\s+\{([\s\S]*?)^\}/gm)]
    .map(([, model, body]) => body.match(/@@map\("([^"]+)"\)/)?.[1] ?? model)
    .sort();
  const requiredValues = sql.match(/WITH required\(name\) AS \(\s*VALUES ([\s\S]*?)\s*\)\s*SELECT/)?.[1];
  assert.ok(requiredValues, "verification SQL has a required-table manifest");
  const sqlTables = [...requiredValues.matchAll(/'([^']+)'/g)].map((match) => match[1]).sort();

  assert.deepEqual(sqlTables, ["_prisma_migrations", ...modelTables].sort());
});

test("scratch provisioning stores an independently generated database sentinel", async () => {
  const sql = await read("./provision-scratch.sql");

  assert.match(sql, /scratch_database/);
  assert.match(sql, /sentinel_nonce/);
  assert.match(sql, /COMMENT ON DATABASE/);
  assert.match(sql, /pg_control_system\(\)/);
});

test("restore entrypoint injects the age identity through stdin for the pinned non-root user", async () => {
  const script = await read("./restore-entrypoint.sh");

  assert.match(script, /^set -eu$/m);
  assert.match(script, /^umask 077$/m);
  assert.match(script, /MIMIC_BACKUP_AGE_IDENTITY_FILE/);
  assert.match(script, /stdin/);
  assert.match(script, /^trap cleanup EXIT$/m);
  assert.match(script, /^trap 'exit 1' HUP INT TERM$/m);
  assert.doesNotMatch(script, /set\s+-[^\n]*x/);
});

test("hostile scratch sentinel and Production identity are rejected before storage access", {
  skip: process.platform === "win32",
}, async () => {
  const testScript = fileURLToPath(
    new URL("./backup-guards.test.sh", import.meta.url),
  );
  const { stdout } = await execFileAsync("sh", [testScript]);

  assert.match(stdout, /hostile recovery guard test passed/);
});

test("restore invokes pg_restore against the temporary libpq service", {
  skip: process.platform === "win32",
}, async () => {
  const testScript = fileURLToPath(
    new URL("./restore-semantics.test.sh", import.meta.url),
  );
  const { stdout } = await execFileAsync("sh", [testScript]);

  assert.match(stdout, /direct restore semantics test passed/);
});

test("runbook follows Railway sibling PITR and immutable signed-backup procedures", async () => {
  const runbook = await readFile(
    new URL("../../docs/operations/postgres-recovery.md", import.meta.url),
    "utf8",
  );

  assert.match(runbook, /https:\/\/docs\.railway\.com\/volumes\/point-in-time-recovery/);
  assert.match(runbook, /Railway creates .*new.*sibling/i);
  assert.doesNotMatch(runbook, /Create a new PostgreSQL service[^\n]*PITR/i);
  assert.match(runbook, /versioning/i);
  assert.match(runbook, /object lock/i);
  assert.match(runbook, /separate.*read.*write/i);
  assert.match(runbook, /MIMIC_RESTORE_SENTINEL_NONCE/);
  assert.match(runbook, /MIMIC_PRODUCTION_SYSTEM_IDENTIFIER/);
  assert.match(runbook, /MIMIC_RESTORE_SENTINEL_NONCE="\$\(/);
  assert.match(runbook, /sed -n '2p'/);
  assert.match(runbook, /MIMIC_BACKUP_MINISIGN_PUBLIC_KEY.*56/);
  assert.match(runbook, /MIMIC_BACKUP_DATABASE_HOST=\$\{\{[^}]+\.PGHOST\}\}/);
  assert.match(runbook, /CREATE ROLE mimic_backup/);
  assert.match(runbook, /GRANT SELECT ON ALL TABLES IN SCHEMA public TO mimic_backup/);
  assert.match(runbook, /GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO mimic_backup/);
  assert.match(runbook, /ALTER DEFAULT PRIVILEGES FOR ROLE :"schema_owner"/);
  assert.match(runbook, /MIMIC_SCHEMA_OWNER="\$\(/);
  assert.match(runbook, /connected_database.*MIMIC_BACKUP_DATABASE_NAME/);
  assert.match(runbook, /\\password mimic_backup/);
  assert.match(runbook, /MIMIC_BACKUP_DATABASE_USER=mimic_backup/);
  assert.doesNotMatch(runbook, /MIMIC_BACKUP_DATABASE_USER=\$\{\{[^}]+\.PGUSER\}\}/);
  assert.doesNotMatch(runbook, /MIMIC_BACKUP_DATABASE_PASSWORD=\$\{\{[^}]+\.PGPASSWORD\}\}/);
  assert.match(runbook, /MIMIC_RESTORE_DATABASE_PASSWORD=\$\{\{[^}]+\.PGPASSWORD\}\}/);
  assert.doesNotMatch(runbook, /MIMIC_(?:BACKUP|RESTORE)_DATABASE_URL/);
});
