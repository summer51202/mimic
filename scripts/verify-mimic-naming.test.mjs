import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { findRetiredBrandReferences } from "./verify-mimic-naming.mjs";

const temporaryRoots = [];
const retiredBrand = "pair" + "fund";

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

test("reports an active retired-brand reference with its path and line number", async () => {
  const root = await createTemporaryRoot();
  await writeFile(
    join(root, "README.md"),
    ["Mimic", retiredBrand, ...Array(7).fill("Mimic"), retiredBrand].join("\n"),
  );

  const references = await findRetiredBrandReferences(root, ["README.md"]);

  assert.deepEqual(references, ["README.md:2", "README.md:10"]);
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
