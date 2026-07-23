import { NextResponse } from "next/server";

import { postToApi } from "@/shared/api/server-api";
import {
  type AuthPayload,
  authRouteErrorResponse,
  csrfRejectedResponse,
  hasValidCsrf,
  invalidJsonResponse,
  readJsonRequestBody,
  setAuthSessionCookies,
} from "@/shared/auth/session";

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasValidCsrf(request)) {
    return csrfRejectedResponse();
  }

  const credentials = await readJsonRequestBody(request);

  if (typeof credentials === "undefined") {
    return invalidJsonResponse();
  }

  try {
    const payload = await postToApi<AuthPayload>("/auth/login", credentials);
    const response = NextResponse.json({ user: payload.user });

    setAuthSessionCookies(response, payload);

    return response;
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
