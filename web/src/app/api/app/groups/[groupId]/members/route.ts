import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface GroupMembersRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function GET(
  request: Request,
  context: GroupMembersRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}/members`, {
    body: "none",
  });
}
