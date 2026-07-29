import { NextResponse } from "next/server";

import { postToApi } from "@/shared/api/server-api";
import {
  type AuthPayload,
  clearSessionCookies,
  readCookie,
  setAuthSessionCookies,
} from "@/shared/auth/session";
import { authCookies } from "@/shared/auth/cookies";
import { safeReturnTo } from "@/shared/navigation/safe-return-to";

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

  return safeReturnTo(returnTo, fallbackReturnTo);
}
