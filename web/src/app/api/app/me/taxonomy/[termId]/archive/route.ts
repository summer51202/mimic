import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
type Context = { params: Promise<{ termId: string }> };
export async function POST(request: Request, context: Context) {
  return forwardSpaceRoute(request, '/me/taxonomy/:termId/archive', context.params);
}
