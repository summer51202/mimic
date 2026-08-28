import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent, traceSampleRate } from "./src/shared/monitoring/sentry-privacy";

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
  tracesSampleRate: traceSampleRate(process.env.MIMIC_SENTRY_TRACES_SAMPLE_RATE),
  beforeSend(event: unknown) {
    return { ...sanitizeSentryEvent(event), type: undefined };
  },
  beforeSendTransaction(event: unknown) {
    return { ...sanitizeSentryEvent(event), type: "transaction" as const };
  },
});
