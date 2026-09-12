import { forwardAppRoute } from '@/shared/api/app-route';

export function GET(request: Request): Promise<Response> {
  return forwardAppRoute(request, '/tasks');
}
