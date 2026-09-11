import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; batchId: string; transferId: string }> };
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-settlements/:batchId/transfers/:transferId/received', context.params);
