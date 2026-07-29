"use client";

interface AppErrorBody {
  error?: {
    code?: string;
    field?: string;
  };
}

export class GroupClientError extends Error {
  readonly code: string;
  readonly field?: string;
  readonly status: number;

  constructor(status: number, code: string, field?: string) {
    super(code);
    this.status = status;
    this.code = code;
    this.field = field;
  }
}

export async function appFetch<T>(
  path: string,
  options: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  },
): Promise<T> {
  const csrf = await fetch("/api/auth/csrf").then((response) =>
    response.json() as Promise<{ token: string }>,
  );
  const response = await fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf.token,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as AppErrorBody;
    throw new GroupClientError(
      response.status,
      body.error?.code ?? `HTTP_${response.status}`,
      body.error?.field,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function groupErrorMessage(error: unknown): string {
  if (!(error instanceof GroupClientError)) {
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

  return "The service is temporarily unavailable. Mimiku kept your changes.";
}
