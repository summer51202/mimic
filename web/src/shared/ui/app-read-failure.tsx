import { notFound } from "next/navigation";

import { classifyReadError } from "@/shared/api/read-state";
import { AppReadRetry } from "@/shared/ui/app-read-retry";
import { AppRouteState } from "@/shared/ui/app-route-state";

interface AppReadFailureProps {
  error: unknown;
}

export function AppReadFailure({ error }: AppReadFailureProps) {
  const state = classifyReadError(error);

  if (state === "not-found") {
    notFound();
  }

  if (state === "unknown") {
    throw error;
  }

  if (state === "unavailable") {
    return <AppReadRetry />;
  }

  return <AppRouteState returnHref="/app" variant={state} />;
}
