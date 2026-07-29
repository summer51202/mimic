import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";
import { isCookieSecure } from "@/shared/auth/cookies";

interface GroupLeaveRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(
  request: Request,
  context: GroupLeaveRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  const response = await forwardAppRoute(request, `/groups/${groupId.value}/leave`, {
    body: "none",
  });

  if (response.ok) {
    response.headers.append("Set-Cookie", clearGroupPreferenceCookie());
  }

  return response;
}

function clearGroupPreferenceCookie(): string {
  return [
    "mimic_group=",
    "Max-Age=0",
    "Path=/",
    "SameSite=Lax",
    ...(isCookieSecure() ? ["Secure"] : []),
  ].join("; ");
}
