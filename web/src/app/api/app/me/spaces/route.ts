import { forwardSpaceRoute } from '@/shared/api/financial-space-route';
export async function GET(request: Request) {
  return forwardSpaceRoute(request, '/me/spaces');
}
export async function POST(request: Request) {
  return forwardSpaceRoute(request, '/me/spaces');
}
