import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string }> };
export const GET = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-expenses/summary', context.params);
