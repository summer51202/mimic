import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ spaceId: string; participantId: string }> };
export const POST = (request: Request, context: Context) => forwardSpaceRoute(request, '/spaces/:spaceId/participants/:participantId/end', context.params);
