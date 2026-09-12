import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; expenseId: string }> };
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/pooled-funds/expenses/:expenseId/delete', context.params);
