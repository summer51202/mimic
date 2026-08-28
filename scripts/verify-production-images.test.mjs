import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

test("backend production image has the Prisma runtime contract", () => {
  const dockerfile = read("backend/Dockerfile");
  const packageJson = JSON.parse(read("backend/package.json"));
  const dockerignore = read("backend/.dockerignore");

  assertContains(dockerfile, /^FROM node:22-bookworm-slim AS build$/m, "backend build stage uses Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim AS runtime$/m, "backend runtime stage uses Node 22 slim");
  assertContains(dockerfile, /^RUN apt-get update && apt-get install -y --no-install-recommends openssl/m, "both stages install OpenSSL");
  assertContains(dockerfile, /^RUN npm ci$/m, "build stage uses reproducible npm ci");
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

  assertContains(dockerfile, /^FROM node:22-bookworm-slim AS deps$/m, "web dependency stage uses Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim AS build$/m, "web build stage uses Node 22 slim");
  assertContains(dockerfile, /^FROM node:22-bookworm-slim AS runtime$/m, "web runtime stage uses Node 22 slim");
  assertContains(dockerfile, /^RUN npm ci$/m, "web installs locked dependencies");
  assertContains(dockerfile, /^ARG MIMIC_API_BASE_URL$/m, "web accepts API URL at build time");
  assertContains(dockerfile, /^ARG NEXT_PUBLIC_MIMIC_SENTRY_DSN$/m, "web accepts public Sentry DSN at build time");
  assertContains(dockerfile, /^ARG NEXT_PUBLIC_MIMIC_ENVIRONMENT$/m, "web accepts public environment at build time");
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

  for (const ignored of [".env*", ".next", "coverage", "node_modules", "playwright-report", "test-results", "*.log", ".session"]) {
    assert.ok(hasLine(dockerignore, ignored), `web ignores ${ignored}`);
  }

  assert.doesNotMatch(dockerfile, /(JWT_(?:ACCESS|REFRESH)_SECRET|DATABASE_URL)\s*=\s*[^$\s]/, "web Dockerfile has no server secret literal");
  assert.doesNotMatch(dockerfile, /^ARG SENTRY_AUTH_TOKEN$/m, "web does not accept a Sentry token as an ARG");
  assert.doesNotMatch(dockerfile, /https?:\/\/[^\s"']+/, "web Dockerfile has no baked-in endpoint literal");
});
