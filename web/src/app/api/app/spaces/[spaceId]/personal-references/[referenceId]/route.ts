import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; referenceId: string }> };
export async function PATCH(request: Request, context: Context) {
  return forwardSpaceRoute(request, '/spaces/:spaceId/personal-references/:referenceId', context.params);
}
