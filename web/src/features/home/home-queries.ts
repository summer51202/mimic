import 'server-only';
import { z } from 'zod';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { ApiError } from '@/shared/api/errors';
import { homeResponseSchema, taskCenterSchema } from '@/shared/api/home-contracts';
import { isAvatarClass, type AvatarClass } from '@/shared/avatar/avatar-classes';

export async function loadHome(groupId?: string) {
  if (groupId && !z.string().uuid().safeParse(groupId).success) throw new ApiError(404, 'GROUP_NOT_FOUND');
  const path = groupId ? `/home?group_id=${encodeURIComponent(groupId)}` : '/home';
  return homeResponseSchema.parse(await authenticatedServerApi(path, { method: 'GET' }));
}

export async function loadTasks() {
  return taskCenterSchema.parse(await authenticatedServerApi('/tasks', { method: 'GET' }));
}

// Keep the raw class: a class this build does not know yet was still chosen, so no prompt.
const homeAvatarSchema = z.object({
  avatar_class: z.string().nullable(),
  avatar_prompt_dismissed: z.boolean(),
});

export type HomeAvatar = { avatarClass: AvatarClass | null; prompt: boolean };

/**
 * Phase Avatar: the current user's class for the Home scene. `/home` stays unchanged, so
 * this reads `/me`. A failed read only costs the cosmetic layer, never Home itself.
 */
export async function loadHomeAvatar(): Promise<HomeAvatar> {
  let me;
  try {
    me = homeAvatarSchema.parse(await authenticatedServerApi('/me', { method: 'GET' }));
  } catch (error) {
    if (error instanceof ApiError || error instanceof z.ZodError) return { avatarClass: null, prompt: false };
    throw error;
  }
  return {
    avatarClass: isAvatarClass(me.avatar_class) ? me.avatar_class : null,
    prompt: me.avatar_class === null && me.avatar_prompt_dismissed === false,
  };
}
