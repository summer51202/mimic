import { forwardAppRoute } from "@/shared/api/app-route";

export async function PATCH(request: Request): Promise<Response> {
  return forwardAppRoute(request, "/me", { body: "json" });
}
