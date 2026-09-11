import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; batchId: string }> };
export const GET = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-settlements/:batchId', context.params);
