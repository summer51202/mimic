"use client";

import { AppClientError } from "@/shared/api/app-fetch";

export function groupErrorKey(error: unknown) {
  if (!(error instanceof AppClientError)) {
    return "settings.service";
  }

  if (error.code === "GROUP_NAME_TAKEN") {
    return "groups.errors.nameTaken";
  }

  if (error.code === "GROUP_RECONCILIATION_REQUIRED") {
    return "groups.errors.reconcile";
  }

  if (error.status === 403) {
    return "groups.errors.forbidden";
  }

  if (error.status === 401) {
    return "settings.expired";
  }

  return "settings.service";
}

export function archiveGroupErrorKey(error: unknown) {
  const unavailable = "groups.errors.archiveUnavailable";

  if (!(error instanceof AppClientError)) {
    return unavailable;
  }

  if (error.code === "GROUP_HAS_OTHER_ACTIVE_MEMBERS") {
    return "groups.errors.remainingMembers";
  }

  if (error.code === "GROUP_HAS_FINANCIAL_HISTORY") {
    return "groups.errors.financialHistory";
  }

  if (error.code === "OWNER_REQUIRED") {
    return "groups.errors.ownerRequired";
  }

  if (error.code === "GROUP_ACCESS_DENIED") {
    return "groups.errors.accessDenied";
  }

  if (error.status === 401) {
    return "settings.expired";
  }

  return unavailable;
}
