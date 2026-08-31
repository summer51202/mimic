import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function hasLine(contents, line) {
  const escapedLine = line.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
  return new RegExp(`^\\s*${escapedLine}\\s*$`, "m").test(contents);
}

function ignoredPatterns(contents) {
  return new Set(
    contents
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#")),
  );
}

function assertIgnored(patterns, pattern, context) {
  assert.ok(patterns.has(pattern), `${context} ignores ${pattern}`);
}

function assertEnvironmentFilesIgnored(patterns, context) {
  assert.ok(
    [".env", ".env*", ".env.*"].some((pattern) => patterns.has(pattern)),
    `${context} ignores .env files`,
  );
}

function assertContains(contents, pattern, description) {
  assert.match(contents, pattern, description);
}

function assertPinnedBaseImages(dockerfile, expectedImage, expectedDigest) {
  const baseImages = [...dockerfile.matchAll(/^FROM\s+(\S+)/gm)].map((match) => match[1]);
  assert.ok(baseImages.length > 0, "Dockerfile has at least one base image");
  for (const image of baseImages) {
    assert.equal(image, `${expectedImage}@sha256:${expectedDigest}`);
  }
}

test("backend production image has the Prisma runtime contract", () => {
  const dockerfile = read("backend/Dockerfile");
  const packageJson = JSON.parse(read("backend/package.json"));
  const dockerignore = read("backend/.dockerignore");

  assertPinnedBaseImages(
    dockerfile,
    "node:22-bookworm-slim",
    "83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5",
  );

  assertContains(dockerfile, /^FROM node:22-bookworm-slim@sha256:[0-9a-f]{64} AS build$/m, "backend build stage uses pinned Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim@sha256:[0-9a-f]{64} AS runtime$/m, "backend runtime stage uses pinned Node 22 slim");
  assertContains(dockerfile, /^RUN apt-get update && apt-get install -y --no-install-recommends openssl/m, "both stages install OpenSSL");
  assertContains(dockerfile, /^RUN npm ci$/m, "build stage installs the dependency lockfile");
  assertContains(dockerfile, /^RUN npm run prisma:generate$/m, "build stage generates Prisma client");
  assertContains(dockerfile, /^RUN npm run build$/m, "build stage compiles Nest");
  assertContains(dockerfile, /^RUN npm ci --omit=dev$/m, "runtime installs production dependencies only");
  assertContains(dockerfile, /^COPY --from=build --chown=node:node \/app\/node_modules\/\.prisma \.\/node_modules\/\.prisma$/m, "runtime includes generated Prisma client and engines");
  assertContains(dockerfile, /^COPY --from=build --chown=node:node \/app\/dist \.\/dist$/m, "runtime includes compiled backend");
  assertContains(dockerfile, /^USER node$/m, "backend runs as node user");
  assertContains(dockerfile, /^CMD \["node", "dist\/src\/main\.js"\]$/m, "backend has the expected start command");

  assert.equal(packageJson.dependencies.prisma, "^5.22.0", "Prisma CLI is a runtime dependency");
  assert.equal(packageJson.devDependencies.prisma, undefined, "Prisma is not duplicated in devDependencies");
  assert.equal(packageJson.scripts["prisma:migrate:deploy"], "prisma migrate deploy", "deployment migration script exists");

  for (const ignored of [".env", ".env*", ".session", "coverage", "dist", "node_modules", "test", "logs", "npm-debug.log*"]) {
    assert.ok(hasLine(dockerignore, ignored), `backend ignores ${ignored}`);
  }
  assert.equal(hasLine(dockerignore, "prisma"), false, "backend build context keeps Prisma schema");
  assert.equal(hasLine(dockerignore, "src"), false, "backend build context keeps source");
});

test("Docker build contexts exclude secrets, VCS data, and generated local output", () => {
  const backendPatterns = ignoredPatterns(read("backend/.dockerignore"));
  const webPatterns = ignoredPatterns(read("web/.dockerignore"));

  for (const [patterns, context] of [
    [backendPatterns, "backend context"],
    [webPatterns, "web context"],
  ]) {
    assertIgnored(patterns, ".git", context);
    assertIgnored(patterns, ".npmrc", context);
    assertEnvironmentFilesIgnored(patterns, context);
    assertIgnored(patterns, "**/*.pem", context);
    assertIgnored(patterns, "**/*.tsbuildinfo", context);
  }

  for (const pattern of [".cache", "coverage", "dist", "node_modules", "test", "logs", ".session"]) {
    assertIgnored(backendPatterns, pattern, "backend context");
  }

  for (const pattern of [
    "public/sw.js",
    ".vercel",
    "out",
    "build",
    ".next",
    "node_modules",
    "playwright-report",
    "test-results",
    "coverage",
    ".session",
  ]) {
    assertIgnored(webPatterns, pattern, "web context");
  }
});

test("web production image uses Next standalone output without secrets", () => {
  const dockerfile = read("web/Dockerfile");
  const nextConfig = read("web/next.config.ts");
  const dockerignore = read("web/.dockerignore");

  assertPinnedBaseImages(
    dockerfile,
    "node:22-bookworm-slim",
    "83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5",
  );
  assertContains(
    dockerfile,
    /^# syntax=docker\/dockerfile:1\.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e$/m,
    "BuildKit Dockerfile frontend is pinned to the verified 1.7 index",
  );

  assertContains(dockerfile, /^FROM node:22-bookworm-slim@sha256:[0-9a-f]{64} AS deps$/m, "web dependency stage uses pinned Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim@sha256:[0-9a-f]{64} AS build$/m, "web build stage uses pinned Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim@sha256:[0-9a-f]{64} AS runtime$/m, "web runtime stage uses pinned Node 22 slim");
  assertContains(dockerfile, /^RUN npm ci$/m, "web installs locked dependencies");
  assertContains(dockerfile, /^ARG MIMIC_API_BASE_URL$/m, "web accepts API URL at build time");
  assertContains(dockerfile, /^ARG NEXT_PUBLIC_MIMIC_SENTRY_DSN$/m, "web accepts public Sentry DSN at build time");
  assertContains(dockerfile, /^ARG NEXT_PUBLIC_MIMIC_ENVIRONMENT$/m, "web accepts public environment at build time");
  assertContains(dockerfile, /^ARG SENTRY_ORG$/m, "web accepts non-secret Sentry organization at build time");
  assertContains(dockerfile, /^ARG SENTRY_PROJECT$/m, "web accepts non-secret Sentry project at build time");
  assertContains(dockerfile, /RUN --mount=type=secret,id=SENTRY_AUTH_TOKEN,required=false/, "web mounts the optional Sentry token as a BuildKit secret");
  assertContains(dockerfile, /\/run\/secrets\/SENTRY_AUTH_TOKEN/, "web reads the token only from the BuildKit secret path");
  assertContains(dockerfile, /^ENV NODE_ENV=production$/m, "web runtime sets production mode");
  assertContains(dockerfile, /^ENV HOSTNAME=0\.0\.0\.0$/m, "web listens on all interfaces");
  assertContains(dockerfile, /^ENV PORT=3000$/m, "web uses port 3000");
  assertContains(dockerfile, /^COPY --from=build --chown=node:node \/app\/public \.\/public$/m, "web runtime includes public assets");
  assertContains(dockerfile, /^COPY --from=build --chown=node:node \/app\/\.next\/standalone \.\/$/m, "web runtime includes standalone server");
  assertContains(dockerfile, /^COPY --from=build --chown=node:node \/app\/\.next\/static \.\/\.next\/static$/m, "web runtime includes static chunks");
  assertContains(dockerfile, /^USER node$/m, "web runs as node user");
  assertContains(dockerfile, /^CMD \["node", "server\.js"\]$/m, "web has the expected start command");
  assertContains(nextConfig, /output:\s*["']standalone["']/, "Next emits standalone output");
  assertContains(nextConfig, /withSerwistInit/, "Serwist wrapper remains configured");
  assertContains(nextConfig, /org:\s*process\.env\.SENTRY_ORG/, "Sentry source-map upload reads its organization from build configuration");
  assertContains(nextConfig, /project:\s*process\.env\.SENTRY_PROJECT/, "Sentry source-map upload reads its project from build configuration");

  for (const ignored of [".env*", ".next", "coverage", "node_modules", "playwright-report", "test-results", "*.log", ".session"]) {
    assert.ok(hasLine(dockerignore, ignored), `web ignores ${ignored}`);
  }

  assert.doesNotMatch(dockerfile, /(JWT_(?:ACCESS|REFRESH)_SECRET|DATABASE_URL)\s*=\s*[^$\s]/, "web Dockerfile has no server secret literal");
  assert.doesNotMatch(dockerfile, /^ARG SENTRY_AUTH_TOKEN$/m, "web does not accept a Sentry token as an ARG");
  assert.doesNotMatch(dockerfile, /^ENV SENTRY_AUTH_TOKEN/m, "web does not store a Sentry token in the image environment");
  assert.doesNotMatch(dockerfile, /https?:\/\/[^\s"']+/, "web Dockerfile has no baked-in endpoint literal");
});

test("Railway web image avoids unsupported Docker secret mounts", () => {
  const railwayDockerfilePath = path.join(repoRoot, "web/Dockerfile.railway");
  assert.ok(existsSync(railwayDockerfilePath), "Railway has a dedicated Web Dockerfile");

  const railwayDockerfile = read("web/Dockerfile.railway");
  assert.doesNotMatch(
    railwayDockerfile,
    /--mount=type=secret/,
    "Railway Dockerfile does not use unsupported BuildKit secret mounts",
  );
  assertContains(railwayDockerfile, /^RUN npm run build$/m, "Railway builds without source-map credentials");
  assertPinnedBaseImages(
    railwayDockerfile,
    "node:22-bookworm-slim",
    "83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5",
  );
  assertContains(railwayDockerfile, /^COPY --from=build --chown=node:node \/app\/\.next\/standalone \.\/$/m, "Railway image keeps standalone output");
  assertContains(railwayDockerfile, /^USER node$/m, "Railway image runs as the non-root node user");
  assert.doesNotMatch(railwayDockerfile, /^ARG SENTRY_AUTH_TOKEN$/m, "Railway image does not accept the Sentry token as an ARG");
  assert.doesNotMatch(railwayDockerfile, /^ENV SENTRY_AUTH_TOKEN/m, "Railway image does not store the Sentry token");
  assert.doesNotMatch(railwayDockerfile, /(JWT_(?:ACCESS|REFRESH)_SECRET|DATABASE_URL)\s*=\s*[^$\s]/, "Railway image has no server secret literal");
});

test("backup build context is deny-by-default and its base image is immutable", () => {
  const dockerfile = read("ops/backup/Dockerfile");
  const dockerignore = read("ops/backup/.dockerignore");
  const patterns = dockerignore
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));

  assertPinnedBaseImages(
    dockerfile,
    "alpine:3.23.5",
    "fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40",
  );
  assert.equal(patterns[0], "**");
  assert.deepEqual(
    new Set(patterns.slice(1)),
    new Set([
      "!Dockerfile",
      "!backup.sh",
      "!restore-drill.sh",
      "!restore-entrypoint.sh",
      "!provision-scratch.sql",
      "!verify-restore.sql",
    ]),
  );
});

test("immutable base image update procedure is documented", () => {
  const runbook = read("docs/operations/container-images.md");
  assert.match(runbook, /Docker Hub/i);
  assert.match(runbook, /multi-arch/i);
  assert.match(runbook, /docker\/dockerfile:1\.7@sha256:a57df69d0ea827fb7266491f2813635de6f17269be881f696fbfdf2d83dda33e/);
  assert.match(runbook, /frontend/i);
  assert.match(runbook, /sha256:/);
  assert.match(runbook, /not byte-for-byte reproducibility/i);
  assert.match(runbook, /verify-production-images\.test\.mjs/);
});
