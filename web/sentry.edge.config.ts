import * as Sentry from "@sentry/nextjs";
import { createSentryEventHooks } from "./src/shared/monitoring/sentry-event-hooks";

const dsn = process.env.MIMIC_SENTRY_DSN?.trim();
const environment = process.env.MIMIC_ENVIRONMENT?.trim();
const release = process.env.MIMIC_WEB_REVISION?.trim();
const eventHooks = createSentryEventHooks();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: environment || undefined,
  release: release || undefined,
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  enableLogs: false,
  tracesSampleRate: 0,
  beforeSend: eventHooks.beforeSend,
  beforeSendTransaction: eventHooks.beforeSendTransaction,
});
