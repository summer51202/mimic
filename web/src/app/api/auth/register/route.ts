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

interface RegisterRequestBody {
  displayName?: unknown;
  email?: unknown;
  password?: unknown;
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!hasValidCsrf(request)) {
    return csrfRejectedResponse();
  }

  const body = await readJsonRequestBody(request);

  if (typeof body === "undefined") {
    return invalidJsonResponse();
  }

  try {
    const registerBody = body as RegisterRequestBody;
    const payload = await postToApi<AuthPayload>("/auth/register", {
      display_name: registerBody.displayName,
      email: registerBody.email,
      password: registerBody.password,
    });
    const response = NextResponse.json({ user: payload.user });

    setAuthSessionCookies(response, payload);

    return response;
  } catch (error) {
    return authRouteErrorResponse(error);
  }
}
