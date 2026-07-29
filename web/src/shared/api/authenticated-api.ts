import "server-only";

import { authCookies } from "@/shared/auth/cookies";
import { readCookie } from "@/shared/auth/session";

import { ApiError } from "./errors";
import { requestToApi } from "./server-api";

type ApiRequestOptions = Parameters<typeof requestToApi>[1];

export async function authenticatedApi<T>(
  request: Request,
  upstreamPath: string,
  options: ApiRequestOptions,
): Promise<T> {
  const accessToken = readCookie(request, authCookies.access);

  if (!accessToken) {
    throw new ApiError(401, "SESSION_REQUIRED");
  }

  const requestId = request.headers.get("x-request-id") ?? undefined;

  return requestToApi<T>(upstreamPath, {
    ...options,
    accessToken,
    requestId,
  });
}
