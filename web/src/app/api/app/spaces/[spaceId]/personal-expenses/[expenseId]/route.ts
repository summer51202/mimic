import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; expenseId: string }> };
export async function PATCH(request: Request, context: Context) {
  return forwardSpaceRoute(request, '/spaces/:spaceId/personal-expenses/:expenseId', context.params);
}
