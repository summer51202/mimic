import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { afterEach, test } from "node:test";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { findRetiredBrandReferences } from "./verify-mimic-naming.mjs";

const temporaryRoots = [];
const retiredBrand = "pair" + "fund";
const scannerPath = fileURLToPath(new URL("./verify-mimic-naming.mjs", import.meta.url));

async function createTemporaryRoot(pathSegment) {
  const temporaryRoot = await mkdtemp(join(tmpdir(), "verify-mimic-naming-"));
  temporaryRoots.push(temporaryRoot);
  if (!pathSegment) {
    return temporaryRoot;
  }

  const parent = join(temporaryRoot, pathSegment);
  await mkdir(parent);
  return mkdtemp(join(parent, "root-"));
}

afterEach(async () => {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })));
});

function runScanner(root) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [scannerPath], { cwd: root });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", rejectRun);
    child.on("close", (exitCode) => {
      resolveRun({ exitCode, stderr, stdout });
    });
  });
}

test("reports an active retired-brand reference with its path and line number", async () => {
  const root = await createTemporaryRoot();
  await writeFile(
    join(root, "README.md"),
    ["Mimic", retiredBrand, "PAIRFUND", ...Array(7).fill("Mimic"), retiredBrand].join("\n"),
  );

  const references = await findRetiredBrandReferences(root, ["README.md"]);

  assert.deepEqual(references, ["README.md:2", "README.md:3", "README.md:11"]);
});

test("ignores immutable migration history and generated node_modules", async () => {
  const root = await createTemporaryRoot("build");
  await mkdir(join(root, "backend", "prisma", "migrations", "20200101000000_initial"), {
    recursive: true,
  });
  await mkdir(join(root, "backend", "src", "node_modules", "generated"), { recursive: true });
  await writeFile(
    join(root, "backend", "prisma", "migrations", "20200101000000_initial", "migration.sql"),
    retiredBrand,
  );
  await writeFile(join(root, "backend", "src", "node_modules", "generated", "index.js"), retiredBrand);
  await writeFile(join(root, "backend", "src", "active.ts"), retiredBrand);

  const references = await findRetiredBrandReferences(root);

  assert.deepEqual(references, ["backend/src/active.ts:1"]);
});

test("fails closed for a non-missing target filesystem error", async () => {
  const root = await createTemporaryRoot();

  await assert.rejects(findRetiredBrandReferences(root, ["\0"]), (error) => {
    assert.equal(error.code, "ERR_INVALID_ARG_VALUE");
    return true;
  });
});

test("skips an external directory junction while scanning an active tree", async (context) => {
  const root = await createTemporaryRoot("symlink-fixture");
  const externalDirectory = resolve(root, "..", "external");
  const linkPath = join(root, "backend", "src", "external-link");
  await mkdir(join(root, "backend", "src"), { recursive: true });
  await mkdir(externalDirectory);
  await writeFile(join(externalDirectory, "legacy.ts"), retiredBrand);

  try {
    await symlink(externalDirectory, linkPath, "junction");
  } catch (error) {
    if (["EACCES", "ENOTSUP", "EPERM"].includes(error.code)) {
      context.skip(`Directory junctions are unavailable: ${error.code}`);
      return;
    }
    throw error;
  }

  const references = await findRetiredBrandReferences(root);

  assert.deepEqual(references, []);
});

test("CLI reports success when active targets have no retired-brand references", async () => {
  const root = await createTemporaryRoot();

  const result = await runScanner(root);

  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "Mimic naming verification passed.\n");
  assert.equal(result.stderr, "");
});

test("CLI reports active retired-brand references and exits unsuccessfully", async () => {
  const root = await createTemporaryRoot();
  await writeFile(join(root, "README.md"), retiredBrand);

  const result = await runScanner(root);

  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "README.md:1\n");
  assert.equal(result.stderr, "");
});
