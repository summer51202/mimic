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
  let csrfToken = await readCsrfToken();
  let response = await sendRequest(path, options, csrfToken);

  if (response.status === 401) {
    const refreshResponse = await fetch("/api/auth/refresh", {
      headers: {
        "content-type": "application/json",
        "x-csrf-token": csrfToken,
      },
      method: "POST",
    });

    if (!refreshResponse.ok) {
      throw await responseError(refreshResponse);
    }

    csrfToken = await readCsrfToken();
    response = await sendRequest(path, options, csrfToken);
  }

  if (!response.ok) {
    throw await responseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

async function readCsrfToken(): Promise<string> {
  const csrf = await fetch("/api/auth/csrf").then((response) =>
    response.json() as Promise<{ token: string }>,
  );

  return csrf.token;
}

function sendRequest(
  path: string,
  options: Omit<RequestInit, "headers"> & {
    headers?: Record<string, string>;
  },
  csrfToken: string,
): Promise<Response> {
  return fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrfToken,
      ...options.headers,
    },
  });
}

async function responseError(response: Response): Promise<GroupClientError> {
  const body = (await response.json().catch(() => ({}))) as AppErrorBody;

  return new GroupClientError(
    response.status,
    body.error?.code ?? `HTTP_${response.status}`,
    body.error?.field,
  );
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

  if (error.status === 401) {
    return "Your session expired. Sign in again, then retry.";
  }

  return "The service is temporarily unavailable. Mimiku kept your changes.";
}
