import { forwardAppRoute } from "@/shared/api/app-route";

export async function POST(request: Request): Promise<Response> {
  return forwardAppRoute(request, "/group-invites/accept", { body: "json" });
}
