import { NextResponse } from "next/server";

import { postToApi } from "@/shared/api/server-api";
import {
  type AuthPayload,
  clearSessionCookies,
  readCookie,
  setAuthSessionCookies,
} from "@/shared/auth/session";
import { authCookies } from "@/shared/auth/cookies";

const fallbackReturnTo = "/app";

export async function GET(request: Request): Promise<NextResponse> {
  const refreshToken = readCookie(request, authCookies.refresh);

  if (!refreshToken) {
    return redirectToLogin(request);
  }

  try {
    const payload = await postToApi<AuthPayload>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    const response = NextResponse.redirect(
      new URL(readReturnTo(request), request.url),
    );

    setAuthSessionCookies(response, payload);

    return response;
  } catch {
    const response = redirectToLogin(request);

    clearSessionCookies(response);

    return response;
  }
}

function redirectToLogin(request: Request): NextResponse {
  return NextResponse.redirect(
    new URL(
      `/login?returnTo=${encodeURIComponent(fallbackReturnTo)}`,
      request.url,
    ),
  );
}

function readReturnTo(request: Request): string {
  const requestUrl = new URL(request.url);
  const returnTo = requestUrl.searchParams.get("returnTo");

  if (!returnTo || /[\u0000-\u001F\u007F\\]/.test(returnTo)) {
    return fallbackReturnTo;
  }

  const normalizedReturnTo = new URL(returnTo, requestUrl);

  if (
    normalizedReturnTo.origin !== requestUrl.origin ||
    (normalizedReturnTo.pathname !== fallbackReturnTo &&
      !normalizedReturnTo.pathname.startsWith(`${fallbackReturnTo}/`))
  ) {
    return fallbackReturnTo;
  }

  return `${normalizedReturnTo.pathname}${normalizedReturnTo.search}${normalizedReturnTo.hash}`;
}
