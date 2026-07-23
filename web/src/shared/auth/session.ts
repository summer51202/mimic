import "server-only";

import { NextResponse } from "next/server";

import { ApiConfigurationError, ApiError } from "@/shared/api/errors";
import { ApiContractError } from "@/shared/api/read-envelope";

import {
  accessCookieMaxAgeSeconds,
  authCookieOptions,
  authCookies,
  clearCookieOptions,
  csrfCookieOptions,
  refreshCookieMaxAgeSeconds,
} from "./cookies";
import { generateCsrfToken, validateCsrf } from "./csrf";

export interface AuthPayload {
  access_token: string;
  refresh_token: string;
  user: unknown;
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");

  if (!header) {
    return undefined;
  }

  for (const part of header.split(";")) {
    const [rawName, ...rawValue] = part.trim().split("=");
    if (rawName === name) {
      try {
        return decodeURIComponent(rawValue.join("="));
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

export function csrfTokenFromRequest(request: Request): string | undefined {
  return request.headers.get("x-csrf-token") ?? undefined;
}

export function hasValidCsrf(request: Request): boolean {
  return validateCsrf(
    readCookie(request, authCookies.csrf),
    csrfTokenFromRequest(request),
  );
}

export function csrfRejectedResponse(): NextResponse {
  return NextResponse.json({ error: "CSRF_INVALID" }, { status: 403 });
}

export function invalidJsonResponse(): NextResponse {
  return authErrorResponse("INVALID_JSON", 400);
}

export function authRouteErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return authErrorResponse(error.code, error.status);
  }

  if (error instanceof ApiConfigurationError) {
    return authErrorResponse("API_CONFIGURATION_ERROR", 500);
  }

  if (error instanceof ApiContractError) {
    return authErrorResponse("API_CONTRACT_ERROR", 502);
  }

  return authErrorResponse("UPSTREAM_UNAVAILABLE", 502);
}

export async function readJsonRequestBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

function authErrorResponse(code: string, status: number): NextResponse {
  return NextResponse.json({ error: { code } }, { status });
}

export function setCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(authCookies.csrf, token, csrfCookieOptions());
}

export function setAuthSessionCookies(
  response: NextResponse,
  payload: AuthPayload,
): void {
  response.cookies.set(
    authCookies.access,
    payload.access_token,
    authCookieOptions(accessCookieMaxAgeSeconds),
  );
  response.cookies.set(
    authCookies.refresh,
    payload.refresh_token,
    authCookieOptions(refreshCookieMaxAgeSeconds),
  );
  setCsrfCookie(response, generateCsrfToken());
}

export function clearSessionCookies(response: NextResponse): void {
  response.cookies.set(authCookies.access, "", clearCookieOptions());
  response.cookies.set(authCookies.refresh, "", clearCookieOptions());
  response.cookies.set(authCookies.csrf, "", clearCookieOptions());
}

export function shouldValidateLogoutCsrf(request: Request): boolean {
  return Boolean(
    readCookie(request, authCookies.access) ||
      readCookie(request, authCookies.refresh),
  );
}
