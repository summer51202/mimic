import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

type RouteContext = { params: Promise<{ fundId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const fundId = await readRouteIdParam(context.params, "fundId", request.headers.get("x-request-id") ?? undefined);
  if (!fundId.ok) return fundId.response;
  return forwardAppRoute(request, `/funds/${fundId.value}/contributions`, { body: "json" });
}
