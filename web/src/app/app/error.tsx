"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { AppRouteState } from "@/shared/ui/app-route-state";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <AppRouteState onRetry={reset} returnHref="/app" variant="unknown" />;
}
