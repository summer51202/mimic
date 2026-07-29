import "server-only";

import { NextResponse } from "next/server";

import { hasValidCsrf } from "@/shared/auth/session";

import { idSchema } from "./domain-contracts";
import { ApiConfigurationError, ApiError } from "./errors";
import { ApiContractError } from "./read-envelope";
import { authenticatedApi } from "./authenticated-api";

type BodyMode = "json" | "none";
type ApiRequestOptions = Parameters<typeof authenticatedApi>[2];

interface ForwardAppRouteOptions {
  body: BodyMode;
}

type ValidatedRouteId =
  | { ok: true; value: string }
  | { ok: false; response: NextResponse };

export async function forwardAppRoute<T>(
  request: Request,
  upstreamPath: string,
  options: ForwardAppRouteOptions,
): Promise<NextResponse> {
  const requestId = request.headers.get("x-request-id") ?? undefined;

  if (request.method !== "GET" && !hasValidCsrf(request)) {
    return appErrorResponse("CSRF_INVALID", 403, requestId);
  }

  const apiOptions = await buildApiOptions(request, options);

  if (!apiOptions) {
    return appErrorResponse("INVALID_JSON", 400, requestId);
  }

  try {
    const data = await authenticatedApi<T>(request, upstreamPath, apiOptions);

    return appJsonResponse({ data }, 200, requestId);
  } catch (error) {
    return appRouteErrorResponse(error, requestId);
  }
}

export async function readRouteIdParam<K extends string>(
  params: Promise<Record<K, string>>,
  key: K,
  requestId?: string,
): Promise<ValidatedRouteId> {
  const value = (await params)[key];
  const decoded = decodeRouteParam(value);

  if (typeof decoded === "undefined") {
    return {
      ok: false,
      response: appErrorResponse("INVALID_ID", 400, requestId),
    };
  }

  const parsed = idSchema.safeParse(decoded);

  if (!parsed.success) {
    return {
      ok: false,
      response: appErrorResponse("INVALID_ID", 400, requestId),
    };
  }

  return { ok: true, value: encodeURIComponent(parsed.data) };
}

async function buildApiOptions(
  request: Request,
  options: ForwardAppRouteOptions,
): Promise<ApiRequestOptions | undefined> {
  if (options.body === "json") {
    try {
      return {
        body: await request.json(),
        method: request.method as "DELETE" | "PATCH" | "POST" | "PUT",
      };
    } catch {
      return undefined;
    }
  }

  return {
    method: request.method as "DELETE" | "GET" | "PATCH" | "POST" | "PUT",
  } as ApiRequestOptions;
}

function appRouteErrorResponse(
  error: unknown,
  requestId: string | undefined,
): NextResponse {
  if (error instanceof ApiError) {
    return appErrorResponse(error.code, error.status, requestId);
  }

  if (error instanceof ApiConfigurationError) {
    return appErrorResponse("API_CONFIGURATION_ERROR", 500, requestId);
  }

  if (error instanceof ApiContractError) {
    return appErrorResponse("API_CONTRACT_ERROR", 502, requestId);
  }

  return appErrorResponse("UPSTREAM_UNAVAILABLE", 502, requestId);
}

function appErrorResponse(
  code: string,
  status: number,
  requestId?: string,
): NextResponse {
  return appJsonResponse({ error: { code } }, status, requestId);
}

function appJsonResponse(
  body: unknown,
  status: number,
  requestId?: string,
): NextResponse {
  const response = NextResponse.json(body, { status });

  response.headers.set("Cache-Control", "private, no-store");

  if (requestId) {
    response.headers.set("x-request-id", requestId);
  }

  return response;
}

function decodeRouteParam(value: string): string | undefined {
  try {
    return decodeURIComponent(value);
  } catch {
    return undefined;
  }
}
