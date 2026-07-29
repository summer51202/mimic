import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticatedApi } from "@/shared/api/authenticated-api";
import { groupSchema } from "@/shared/api/domain-contracts";
import { ApiConfigurationError, ApiError } from "@/shared/api/errors";
import { ApiContractError } from "@/shared/api/read-envelope";
import { isCookieSecure } from "@/shared/auth/cookies";
import { hasValidCsrf, readJsonRequestBody } from "@/shared/auth/session";

const bodySchema = z.object({
  group_id: z.string().trim().min(1).max(128),
});

const groupPreferenceCookie = "mimic_group";

export async function POST(request: Request): Promise<Response> {
  const requestId = request.headers.get("x-request-id") ?? undefined;

  if (!hasValidCsrf(request)) {
    return appErrorResponse("CSRF_INVALID", 403, requestId);
  }

  const parsed = bodySchema.safeParse(await readJsonRequestBody(request));

  if (!parsed.success) {
    return appErrorResponse("INVALID_JSON", 400, requestId);
  }

  try {
    const data = await authenticatedApi<unknown>(request, "/groups", {
      method: "GET",
    });
    const groups = groupSchema.array().parse(data);
    const visible = groups.some(
      (group) =>
        group.id === parsed.data.group_id &&
        (group.status === "active" || group.status === "ACTIVE"),
    );

    if (!visible) {
      return appErrorResponse("GROUP_NOT_FOUND", 404, requestId);
    }

    const response = new NextResponse(null, { status: 204 });

    response.headers.set("Cache-Control", "private, no-store");
    response.cookies.set(groupPreferenceCookie, parsed.data.group_id, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: isCookieSecure(),
    });

    if (requestId) {
      response.headers.set("x-request-id", requestId);
    }

    return response;
  } catch (error) {
    return routeErrorResponse(error, requestId);
  }
}

function routeErrorResponse(
  error: unknown,
  requestId: string | undefined,
): NextResponse {
  if (error instanceof ApiError) {
    return appErrorResponse(error.code, error.status, requestId);
  }

  if (error instanceof ApiConfigurationError) {
    return appErrorResponse("API_CONFIGURATION_ERROR", 500, requestId);
  }

  if (error instanceof ApiContractError || error instanceof z.ZodError) {
    return appErrorResponse("API_CONTRACT_ERROR", 502, requestId);
  }

  return appErrorResponse("UPSTREAM_UNAVAILABLE", 502, requestId);
}

function appErrorResponse(
  code: string,
  status: number,
  requestId?: string,
): NextResponse {
  const response = NextResponse.json({ error: { code } }, { status });

  response.headers.set("Cache-Control", "private, no-store");

  if (requestId) {
    response.headers.set("x-request-id", requestId);
  }

  return response;
}
