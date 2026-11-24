"use client";

import * as Sentry from "@sentry/nextjs";
import zh from "@/i18n/messages/zh-TW.json";
import ja from "@/i18n/messages/ja.json";
import en from "@/i18n/messages/en.json";
import { useEffect } from "react";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-Hant">
      <body>
        <main role="alert">
          <p>{zh.routeState.global}</p>
          <p lang="en">{en.routeState.global}</p>
          <p lang="ja">{ja.routeState.global}</p>
        </main>
      </body>
    </html>
  );
}
