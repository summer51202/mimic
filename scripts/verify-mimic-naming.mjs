import { lstat, readdir, readFile } from "node:fs/promises";
import { basename, extname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export const activeTargets = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  ".agents/features.md",
  "backend/.env.example",
  "backend/package.json",
  "backend/package-lock.json",
  "backend/prisma/seed.ts",
  "backend/src",
  "backend/test",
  "backend/README.md",
  "web/package.json",
  "web/package-lock.json",
  "web/src",
  "web/e2e",
  "web/scripts",
  "web/README.md",
  "docs/api/mimic-openapi-v0.2.yaml",
  "docs/design/mimic-prd-v0.2-final.md",
  "docs/design/mimic-backend-accounting-module-map-v0.2.md",
  "docs/design/mimic-web-ui-v0.2.md",
];

const ignoredPathSegments = new Set([".git", ".next", "build", "coverage", "dist", "node_modules"]);
const textExtensions = new Set([
  ".css",
  ".dart",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".prisma",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const retiredBrandPattern = /pairfund/iu;
const referenceCollator = new Intl.Collator("en", { numeric: true });

function isIgnoredPath(root, path) {
  return relative(root, path).split(/[\\/]/u).some((segment) => ignoredPathSegments.has(segment));
}

function isTextFile(path) {
  return basename(path) === ".env.example" || textExtensions.has(extname(path).toLowerCase());
}

async function collectTextFiles(root, path, files) {
  if (isIgnoredPath(root, path)) {
    return;
  }

  let entry;
  try {
    entry = await lstat(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw error;
  }

  if (entry.isSymbolicLink()) {
    return;
  }

  if (entry.isFile()) {
    if (isTextFile(path)) {
      files.push(path);
    }
    return;
  }

  if (!entry.isDirectory()) {
    return;
  }

  const children = await readdir(path, { withFileTypes: true });
  await Promise.all(
    children.map((child) => collectTextFiles(root, resolve(path, child.name), files)),
  );
}

export async function findRetiredBrandReferences(root, targets = activeTargets) {
  const rootPath = resolve(root);
  const files = [];

  await Promise.all(
    targets.map((target) => {
      const targetPath = resolve(rootPath, target);
      const targetRelativePath = relative(rootPath, targetPath);
      if (targetRelativePath === ".." || targetRelativePath.startsWith(`..${sep}`)) {
        return undefined;
      }
      return collectTextFiles(rootPath, targetPath, files);
    }),
  );

  const references = [];
  await Promise.all(
    files.map(async (file) => {
      const content = await readFile(file, "utf8");
      const displayPath = relative(rootPath, file).split(sep).join("/");
      content.split(/\r?\n/u).forEach((line, index) => {
        if (retiredBrandPattern.test(line)) {
          references.push(`${displayPath}:${index + 1}`);
        }
      });
    }),
  );

  return references.sort(referenceCollator.compare);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const references = await findRetiredBrandReferences(process.cwd());
  if (references.length > 0) {
    console.log(references.join("\n"));
    process.exitCode = 1;
  } else {
    console.log("Mimic naming verification passed.");
  }
}
