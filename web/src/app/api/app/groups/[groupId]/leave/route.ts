import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

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

  return forwardAppRoute(request, `/groups/${groupId.value}/leave`, {
    body: "none",
  });
}
