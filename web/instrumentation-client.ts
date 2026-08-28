import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "./src/shared/monitoring/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_MIMIC_SENTRY_DSN?.trim();
const environment = process.env.NEXT_PUBLIC_MIMIC_ENVIRONMENT?.trim();

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
  beforeSend(event: unknown, hint: { attachments?: unknown[] }) {
    hint.attachments = [];
    return { ...sanitizeSentryEvent(event), type: undefined };
  },
  beforeSendTransaction() {
    return null;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
