import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface GroupRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function GET(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}`, { body: "none" });
}

export async function PATCH(
  request: Request,
  context: GroupRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}`, { body: "json" });
}
