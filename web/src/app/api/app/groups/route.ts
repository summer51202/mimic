import { forwardAppRoute } from "@/shared/api/app-route";

export async function GET(request: Request): Promise<Response> {
  return forwardAppRoute(request, "/groups", { body: "none" });
}

export async function POST(request: Request): Promise<Response> {
  return forwardAppRoute(request, "/groups", { body: "json" });
}
