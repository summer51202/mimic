import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";
import { clearGroupPreferenceCookie } from "@/shared/auth/group-preference-cookie";

interface GroupArchiveRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(
  request: Request,
  context: GroupArchiveRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(
    context.params,
    "groupId",
    request.headers.get("x-request-id") ?? undefined,
  );

  if (!groupId.ok) {
    return groupId.response;
  }

  const response = await forwardAppRoute(
    request,
    `/groups/${groupId.value}/archive`,
    { body: "none" },
  );

  if (response.ok) {
    response.headers.append("Set-Cookie", clearGroupPreferenceCookie());
  }

  return response;
}
