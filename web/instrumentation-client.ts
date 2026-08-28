import * as Sentry from "@sentry/nextjs";
import { sanitizeSentryEvent, traceSampleRate } from "./src/shared/monitoring/sentry-privacy";

const dsn = process.env.NEXT_PUBLIC_MIMIC_SENTRY_DSN?.trim();
const environment = process.env.NEXT_PUBLIC_MIMIC_ENVIRONMENT?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: environment || undefined,
  sendDefaultPii: false,
  maxBreadcrumbs: 0,
  enableLogs: false,
  tracesSampleRate: traceSampleRate(process.env.NEXT_PUBLIC_MIMIC_SENTRY_TRACES_SAMPLE_RATE),
  profilesSampleRate: 0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
  beforeSend(event: unknown) {
    return { ...sanitizeSentryEvent(event), type: undefined };
  },
  beforeSendTransaction(event: unknown) {
    return { ...sanitizeSentryEvent(event), type: "transaction" as const };
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
