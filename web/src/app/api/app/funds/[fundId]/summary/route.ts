import { forwardAppRoute, readRouteIdParam } from "@/shared/api/app-route";

interface FundSummaryRouteContext {
  params: Promise<{ fundId: string }>;
}

export async function GET(
  request: Request,
  context: FundSummaryRouteContext,
): Promise<Response> {
  const fundId = await readRouteIdParam(context.params, "fundId", request.headers.get("x-request-id") ?? undefined);

  if (!fundId.ok) {
    return fundId.response;
  }

  return forwardAppRoute(request, `/funds/${fundId.value}/summary`, {
    body: "none",
  });
}
