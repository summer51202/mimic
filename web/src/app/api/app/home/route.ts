import { NextResponse } from 'next/server';
import { forwardAppRoute } from '@/shared/api/app-route';

export function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('group_id');
  if ([...url.searchParams.keys()].some((key) => key !== 'group_id') || (groupId && !/^[0-9a-f-]{36}$/i.test(groupId))) {
    return Promise.resolve(NextResponse.json({ error: { code: 'HOME_GROUP_INVALID' } }, { status: 400 }));
  }
  return forwardAppRoute(request, groupId ? `/home?group_id=${encodeURIComponent(groupId)}` : '/home');
}
