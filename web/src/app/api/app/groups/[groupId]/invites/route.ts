import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface GroupInvitesRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function POST(
  request: Request,
  context: GroupInvitesRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}/invites`, {
    body: "json",
  });
}
