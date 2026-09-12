import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; commitmentId: string }> };
export const PATCH = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/pooled-funds/commitments/:commitmentId', context.params);
