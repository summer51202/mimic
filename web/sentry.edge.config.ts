import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent } from "./src/shared/monitoring/sentry-privacy";

const dsn = process.env.MIMIC_SENTRY_DSN?.trim();
const environment = process.env.MIMIC_ENVIRONMENT?.trim();
const release = process.env.MIMIC_WEB_REVISION?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: environment || undefined,
  release: release || undefined,
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  enableLogs: false,
  tracesSampleRate: 0,
  beforeSend(event: unknown, hint: { attachments?: unknown[] }) {
    hint.attachments = [];
    return { ...sanitizeSentryEvent(event), type: undefined };
  },
  beforeSendTransaction() {
    return null;
  },
});
