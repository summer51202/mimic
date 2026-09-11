import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ groupId: string }> };
export const GET = (request: Request, context: Context) => forwardSpaceRoute(request, '/groups/:groupId/spaces', context.params);
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/groups/:groupId/spaces', context.params);
