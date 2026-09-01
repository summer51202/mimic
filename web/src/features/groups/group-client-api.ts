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

export function archiveGroupErrorMessage(error: unknown): string {
  const unavailable =
    "The service is temporarily unavailable. Mimiku kept this group.";

  if (!(error instanceof AppClientError)) {
    return unavailable;
  }

  if (error.code === "GROUP_HAS_OTHER_ACTIVE_MEMBERS") {
    return "Other active members must leave first.";
  }

  if (error.code === "GROUP_HAS_FINANCIAL_HISTORY") {
    return "Groups with financial history cannot be deleted.";
  }

  if (error.code === "OWNER_REQUIRED") {
    return "Only an owner can delete an empty group.";
  }

  if (error.code === "GROUP_ACCESS_DENIED") {
    return "You no longer have access to this group.";
  }

  if (error.status === 401) {
    return "Your session expired. Sign in again, then retry.";
  }

  return unavailable;
}
