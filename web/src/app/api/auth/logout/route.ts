import { NextResponse } from "next/server";

import { postToApi } from "@/shared/api/server-api";
import {
  clearSessionCookies,
  csrfRejectedResponse,
  hasValidCsrf,
  readCookie,
  shouldValidateLogoutCsrf,
} from "@/shared/auth/session";
import { authCookies } from "@/shared/auth/cookies";

export async function POST(request: Request): Promise<NextResponse> {
  if (shouldValidateLogoutCsrf(request) && !hasValidCsrf(request)) {
    return csrfRejectedResponse();
  }

  const accessToken = readCookie(request, authCookies.access);

  if (accessToken) {
    try {
      await postToApi("/auth/logout", {}, { accessToken });
    } catch {
      // Logout must clear the local browser session even if the API lacks logout.
    }
  }

  const response = NextResponse.json({ ok: true });

  clearSessionCookies(response);

  return response;
}
