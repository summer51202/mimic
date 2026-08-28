import assert from "node:assert/strict";
import test from "node:test";

import { createRailwayContext, project } from "railway/iac";

import railwayProgram from "./railway.ts";

async function definitionFor(environmentName) {
  return railwayProgram(
    createRailwayContext({
      command: "test",
      environment: environmentName,
      environmentName,
      projectId: "5d023e04-e7cc-4bc1-b4a8-16d85c89a65b",
      projectName: "Mimic",
    }),
    project,
  );
}

function resource(definition, type, name) {
  const match = definition.resources.flat().find(
    (candidate) => candidate.type === type && candidate.name === name,
  );
  assert.ok(match, `${type} ${name} must exist`);
  return match;
}

function variable(service, name) {
  assert.ok(service.variables?.[name], `${service.name}.${name} must exist`);
  return service.variables[name];
}

for (const environmentName of ["staging", "production"]) {
  test(`${environmentName} defines the isolated web, API, and PostgreSQL topology`, async () => {
    const definition = await definitionFor(environmentName);
    const expectedBranch =
      environmentName === "staging"
        ? "codex/mimic-baseline-railway-safety"
        : "main";

    assert.equal(definition.name, "Mimic");
    assert.deepEqual(definition.environments, ["staging", "production"]);
    assert.deepEqual(
      definition.resources.flat().map(({ type, name }) => `${type}:${name}`).sort(),
      [
        "database:mimic-postgres",
        "service:mimic-api",
        "service:mimic-web",
      ],
    );

    const database = resource(definition, "database", "mimic-postgres");
    const api = resource(definition, "service", "mimic-api");
    const web = resource(definition, "service", "mimic-web");

    assert.equal(database.engine, "postgres");
    assert.equal(database.image, "ghcr.io/railwayapp-templates/postgres-ssl:18");
    assert.deepEqual(database.deploy?.multiRegionConfig, {
      "asia-southeast1-eqsg3a": { numReplicas: 1 },
    });

    assert.deepEqual(api.source, {
      type: "github",
      repo: "summer51202/mimic",
      branch: expectedBranch,
      rootDirectory: "/backend",
    });
    assert.equal(api.build?.builder, "DOCKERFILE");
    assert.equal(api.build?.dockerfilePath, "Dockerfile");
    assert.deepEqual(api.build?.watchPatterns, ["/backend/**"]);
    assert.deepEqual(api.deploy?.preDeployCommand, ["npm run prisma:migrate:deploy"]);
    assert.equal(api.deploy?.healthcheckPath, "/api/v1/health/ready");
    assert.equal(api.deploy?.restartPolicyType, "ON_FAILURE");
    assert.deepEqual(api.deploy?.multiRegionConfig, {
      "asia-southeast1-eqsg3a": { numReplicas: 1 },
    });

    assert.deepEqual(web.source, {
      type: "github",
      repo: "summer51202/mimic",
      branch: expectedBranch,
      rootDirectory: "/web",
    });
    assert.equal(web.build?.builder, "DOCKERFILE");
    assert.equal(web.build?.dockerfilePath, "Dockerfile.railway");
    assert.deepEqual(web.build?.watchPatterns, ["/web/**"]);
    assert.equal(web.deploy?.healthcheckPath, "/api/health/ready");
    assert.equal(web.deploy?.restartPolicyType, "ON_FAILURE");
    assert.deepEqual(web.deploy?.multiRegionConfig, {
      "asia-southeast1-eqsg3a": { numReplicas: 1 },
    });

    assert.deepEqual(variable(api, "DATABASE_URL"), {
      type: "reference",
      resource: "database.mimic-postgres",
      output: "DATABASE_URL",
    });
    assert.equal(variable(api, "MIMIC_ENVIRONMENT").value, environmentName);
    assert.equal(variable(web, "MIMIC_ENVIRONMENT").value, environmentName);
    assert.equal(
      variable(web, "NEXT_PUBLIC_MIMIC_ENVIRONMENT").value,
      environmentName,
    );
  });
}

test("secrets are preserved by name and never embedded as literals", async () => {
  const definition = await definitionFor("staging");
  const api = resource(definition, "service", "mimic-api");
  const web = resource(definition, "service", "mimic-web");

  for (const name of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "MIMIC_SENTRY_DSN", "CORS_ORIGIN"]) {
    assert.deepEqual(variable(api, name), { type: "preserve" });
  }
  for (const name of [
    "MIMIC_SENTRY_DSN",
    "NEXT_PUBLIC_MIMIC_SENTRY_DSN",
    "SENTRY_ORG",
    "SENTRY_PROJECT",
  ]) {
    assert.deepEqual(variable(web, name), { type: "preserve" });
  }

  for (const service of [api, web]) {
    assert.equal(service.variables?.SENTRY_AUTH_TOKEN, undefined);
    assert.equal(service.deploy?.cronSchedule, undefined);
  }
});

test("runtime references and release metadata contain no environment-specific origin", async () => {
  const definition = await definitionFor("production");
  const api = resource(definition, "service", "mimic-api");
  const web = resource(definition, "service", "mimic-web");

  assert.equal(variable(api, "MIMIC_EXPECTED_MIGRATION").value, "20260715125137_init");
  assert.equal(variable(api, "MIMIC_BACKEND_REVISION").value, "${{RAILWAY_GIT_COMMIT_SHA}}");
  assert.equal(variable(web, "MIMIC_WEB_REVISION").value, "${{RAILWAY_GIT_COMMIT_SHA}}");
  assert.equal(
    variable(web, "MIMIC_API_BASE_URL").value,
    "http://${{mimic-api.RAILWAY_PRIVATE_DOMAIN}}:${{mimic-api.PORT}}/api/v1",
  );
  assert.equal(variable(web, "MIMIC_COOKIE_SECURE").value, "true");
});

test("production backup scheduling remains absent until recovery gates are satisfied", async () => {
  const definition = await definitionFor("production");
  assert.equal(
    definition.resources.flat().some(({ name }) => name === "mimic-backup-job"),
    false,
  );
});
