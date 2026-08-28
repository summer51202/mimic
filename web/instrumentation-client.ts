import * as Sentry from "@sentry/nextjs";
import { createSentryEventHooks } from "./src/shared/monitoring/sentry-event-hooks";

const dsn = process.env.NEXT_PUBLIC_MIMIC_SENTRY_DSN?.trim();
const environment = process.env.NEXT_PUBLIC_MIMIC_ENVIRONMENT?.trim();
const eventHooks = createSentryEventHooks();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: environment || undefined,
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  enableLogs: false,
  tracesSampleRate: 0,
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend: eventHooks.beforeSend,
  beforeSendTransaction: eventHooks.beforeSendTransaction,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
