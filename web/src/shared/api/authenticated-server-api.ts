import "server-only";

import { cookies, headers } from "next/headers";

import { authCookies } from "@/shared/auth/cookies";

import { ApiError } from "./errors";
import { requestToApi } from "./server-api";

type ApiRequestOptions = Parameters<typeof requestToApi>[1];

export async function authenticatedServerApi<T>(
  upstreamPath: string,
  options: ApiRequestOptions,
): Promise<T> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(authCookies.access)?.value;

  if (!accessToken) {
    throw new ApiError(401, "SESSION_REQUIRED");
  }

  const headerStore = await headers();
  const requestId = headerStore.get("x-request-id") ?? undefined;

  return requestToApi<T>(upstreamPath, {
    ...options,
    accessToken,
    requestId,
  });
}
