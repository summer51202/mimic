import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string }> };
export const GET = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/participants', context.params);
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/participants', context.params);
