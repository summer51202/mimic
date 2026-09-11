import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string }> };
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-corrections/transfers', context.params);
