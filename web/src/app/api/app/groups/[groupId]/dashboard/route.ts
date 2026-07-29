import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface GroupDashboardRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function GET(
  request: Request,
  context: GroupDashboardRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}/dashboard`, {
    body: "none",
  });
}
