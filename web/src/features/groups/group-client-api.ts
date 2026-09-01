"use client";

import { AppClientError } from "@/shared/api/app-fetch";

export function groupErrorMessage(error: unknown): string {
  if (!(error instanceof AppClientError)) {
    return "The service is temporarily unavailable. Mimiku kept your changes.";
  }

  if (error.code === "GROUP_NAME_TAKEN") {
    return "This group name is already used.";
  }

  if (error.code === "GROUP_RECONCILIATION_REQUIRED") {
    return "Settle open balances before leaving.";
  }

  if (error.status === 403) {
    return "You do not have permission to change this group.";
  }

  if (error.status === 401) {
    return "Your session expired. Sign in again, then retry.";
  }

  return "The service is temporarily unavailable. Mimiku kept your changes.";
}
