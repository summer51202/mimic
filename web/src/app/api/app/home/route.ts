import { NextResponse } from 'next/server';
import { z } from 'zod';
import { forwardAppRoute } from '@/shared/api/app-route';

const groupIdSchema = z.string().uuid();

export function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const groupId = url.searchParams.get('group_id');
  if ([...url.searchParams.keys()].some((key) => key !== 'group_id') || url.searchParams.getAll('group_id').length > 1
    || (groupId && !groupIdSchema.safeParse(groupId).success)) {
    return Promise.resolve(NextResponse.json({ error: { code: 'HOME_GROUP_INVALID' } }, { status: 400 }));
  }
  return forwardAppRoute(request, groupId ? `/home?group_id=${encodeURIComponent(groupId)}` : '/home', { body: 'none' });
}
