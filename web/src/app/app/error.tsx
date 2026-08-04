"use client";

import { AppRouteState } from "@/shared/ui/app-route-state";

interface AppErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function AppError({ reset }: AppErrorProps) {
  return <AppRouteState onRetry={reset} returnHref="/app" variant="unknown" />;
}
