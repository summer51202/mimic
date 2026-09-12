import 'server-only';
import { z } from 'zod';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { ApiError } from '@/shared/api/errors';
import { homeResponseSchema, taskCenterSchema } from '@/shared/api/home-contracts';

export async function loadHome(groupId?: string) {
  if (groupId && !z.string().uuid().safeParse(groupId).success) throw new ApiError(404, 'GROUP_NOT_FOUND');
  const path = groupId ? `/home?group_id=${encodeURIComponent(groupId)}` : '/home';
  return homeResponseSchema.parse(await authenticatedServerApi(path, { method: 'GET' }));
}

export async function loadTasks() {
  return taskCenterSchema.parse(await authenticatedServerApi('/tasks', { method: 'GET' }));
}
