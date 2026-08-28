import {
  defineRailway,
  database,
  github,
  preserve,
  project,
  service,
} from "railway/iac";

const repository = "summer51202/mimic";
const region = "asia-southeast1-eqsg3a";
const environments = ["staging", "production"];

export default defineRailway((context) => {
  const environment = environments.find((name) => context.isEnvironment(name));
  if (!environment) {
    throw new Error(
      `Refusing to configure unknown Railway environment: ${context.environmentName ?? "unset"}`,
    );
  }
  // Temporary bootstrap: deploy this feature branch to Staging for validation.
  // Before merging, switch Staging back to main, update the contract, and review
  // a fresh Staging plan so future main merges remain the deployment source.
  const branch =
    environment === "staging" ? "codex/mimic-baseline-railway-safety" : "main";

  // The SDK's postgres() helper currently tracks PostgreSQL 18. Mimic recovery
  // tooling is deliberately pinned to major 16, so keep the image explicit.
  const postgresDatabase = database("mimic-postgres", "postgres", {
    image: "ghcr.io/railwayapp-templates/postgres-ssl:16",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
    region,
  });

  const api = service("mimic-api", {
    source: github(repository, { branch, rootDirectory: "/backend" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      watchPatterns: ["/backend/**"],
    },
    preDeploy: "npm run prisma:migrate:deploy",
    healthcheck: "/api/v1/health/ready",
    healthcheckTimeout: 120,
    regions: { [region]: 1 },
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      NODE_ENV: "production",
      DATABASE_URL: postgresDatabase.env.DATABASE_URL,
      JWT_ACCESS_SECRET: preserve(),
      JWT_REFRESH_SECRET: preserve(),
      MIMIC_BACKEND_REVISION: "${{RAILWAY_GIT_COMMIT_SHA}}",
      MIMIC_ENVIRONMENT: environment,
      MIMIC_EXPECTED_MIGRATION: "20260715125137_init",
      MIMIC_SENTRY_DSN: preserve(),
      CORS_ORIGIN: preserve(),
    },
  });

  const web = service("mimic-web", {
    source: github(repository, { branch, rootDirectory: "/web" }),
    build: {
      builder: "DOCKERFILE",
      dockerfilePath: "Dockerfile",
      watchPatterns: ["/web/**"],
    },
    healthcheck: "/api/health/ready",
    healthcheckTimeout: 120,
    regions: { [region]: 1 },
    deploy: {
      restartPolicyType: "ON_FAILURE",
      restartPolicyMaxRetries: 10,
    },
    env: {
      NODE_ENV: "production",
      MIMIC_API_BASE_URL:
        "http://${{mimic-api.RAILWAY_PRIVATE_DOMAIN}}:${{mimic-api.PORT}}/api/v1",
      MIMIC_COOKIE_SECURE: "true",
      MIMIC_ENVIRONMENT: environment,
      MIMIC_WEB_REVISION: "${{RAILWAY_GIT_COMMIT_SHA}}",
      MIMIC_SENTRY_DSN: preserve(),
      NEXT_PUBLIC_MIMIC_ENVIRONMENT: environment,
      NEXT_PUBLIC_MIMIC_SENTRY_DSN: preserve(),
      SENTRY_ORG: preserve(),
      SENTRY_PROJECT: preserve(),
    },
  });

  return project("Mimic", {
    environments,
    resources: [postgresDatabase, api, web],
  });
});
