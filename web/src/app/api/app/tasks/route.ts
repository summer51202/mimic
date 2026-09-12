import { forwardAppRoute } from '@/shared/api/app-route';
import { NextResponse } from 'next/server';

export function GET(request: Request): Promise<Response> {
  if (new URL(request.url).searchParams.size > 0) {
    return Promise.resolve(NextResponse.json({ error: { code: 'TASK_QUERY_INVALID' } }, { status: 400 }));
  }
  return forwardAppRoute(request, '/tasks', { body: 'none' });
}
