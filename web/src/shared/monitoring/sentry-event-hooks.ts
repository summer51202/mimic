import { sanitizeSentryEvent } from "./sentry-privacy";

export interface SentryHintLike {
  attachments?: unknown[];
}

export function createSentryEventHooks() {
  return {
    beforeSend(event: unknown, hint?: SentryHintLike | null) {
      if (hint) hint.attachments = [];
      return { ...sanitizeSentryEvent(event), type: undefined };
    },
    beforeSendTransaction() {
      return null;
    },
  };
}
