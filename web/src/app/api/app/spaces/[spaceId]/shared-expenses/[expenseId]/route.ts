import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; expenseId: string }> };
export const GET = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-expenses/:expenseId', context.params);
export const PATCH = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/shared-expenses/:expenseId', context.params);
