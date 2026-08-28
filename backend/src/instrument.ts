import * as Sentry from '@sentry/nestjs';
import { sanitizeSentryEvent, traceSampleRate } from './monitoring/sentry-privacy';

const dsn = process.env.MIMIC_SENTRY_DSN?.trim();
const environment = process.env.MIMIC_ENVIRONMENT?.trim();
const release = process.env.MIMIC_BACKEND_REVISION?.trim();

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: environment || undefined,
  release: release || undefined,
  sendDefaultPii: false,
  includeLocalVariables: false,
  maxBreadcrumbs: 0,
  enableLogs: false,
  tracesSampleRate: traceSampleRate(process.env.MIMIC_SENTRY_TRACES_SAMPLE_RATE),
  profilesSampleRate: 0,
  beforeSend(event) {
    return { ...sanitizeSentryEvent(event), type: undefined };
  },
  beforeSendTransaction(event) {
    return { ...sanitizeSentryEvent(event), type: 'transaction' as const };
  },
});
