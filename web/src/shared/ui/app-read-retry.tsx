"use client";

import { useRouter } from "next/navigation";

import { AppRouteState } from "@/shared/ui/app-route-state";

export function AppReadRetry() {
  const router = useRouter();

  return (
    <AppRouteState
      onRetry={() => router.refresh()}
      returnHref="/app"
      variant="unavailable"
    />
  );
}
