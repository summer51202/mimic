import 'server-only';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { forwardAppRoute } from './app-route';

export async function forwardSpaceRoute(request: Request, template: string, params: Promise<Record<string, string>> = Promise.resolve({})) {
  let path = template;
  for (const [key, value] of Object.entries(await params)) {
    if (!z.string().uuid().safeParse(value).success) return NextResponse.json({ error: { code: 'INVALID_ID' } }, { status: 400 });
    path = path.replace(`:${key}`, encodeURIComponent(value));
  }
  if (request.method === 'GET') {
    const query = new URL(request.url).searchParams;
    const allowed = path.endsWith('/taxonomy') ? ['kind', 'category_id', 'q', 'locale', 'include_inactive']
      : path.endsWith('/personal-expenses') ? ['month', 'cursor', 'limit']
        : path.endsWith('/shared-expenses') || path.endsWith('/shared-settlements') || path.endsWith('/shared-corrections')
          ? ['cursor', 'limit'] : [];
    if ([...query.keys()].some(key => !allowed.includes(key))) return NextResponse.json({ error: { code: 'INVALID_QUERY' } }, { status: 400 });
    if (query.size) path += `?${query.toString()}`;
  }
  return forwardAppRoute(request, path, { body: request.method === 'GET' ? 'none' : 'json' });
}
