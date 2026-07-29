import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface GroupFundsRouteContext {
  params: Promise<{ groupId: string }>;
}

export async function GET(
  request: Request,
  context: GroupFundsRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}/funds`, {
    body: "none",
  });
}

export async function POST(
  request: Request,
  context: GroupFundsRouteContext,
): Promise<Response> {
  const groupId = await readRouteIdParam(context.params, "groupId", request.headers.get("x-request-id") ?? undefined);

  if (!groupId.ok) {
    return groupId.response;
  }

  return forwardAppRoute(request, `/groups/${groupId.value}/funds`, {
    body: "json",
  });
}
