import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string }> };
export async function GET(request: Request, context: Context) {
  return forwardSpaceRoute(request, '/spaces/:spaceId', context.params);
}
