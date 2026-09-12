import 'server-only';
import { z } from 'zod';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { groupDetailSchema, memberSchema } from '@/shared/api/domain-contracts';
import { ApiError } from '@/shared/api/errors';
import { pooledWorkspaceSchema } from '@/shared/api/pooled-finance-contracts';
import { sharedParticipantSchema } from '@/shared/api/shared-finance-contracts';
import { taxonomyPickerSchema } from '@/shared/api/taxonomy-contracts';

const uuid = z.string().uuid();

export async function listGroupPooledSpaces(groupId: string) {
  if (!uuid.safeParse(groupId).success) throw new ApiError(404, 'GROUP_NOT_FOUND');
  const raw = await authenticatedServerApi(`/groups/${groupId}/spaces`, { method: 'GET' });
  return financialSpaceSchema.array().parse(raw).filter((space) => space.mode === 'POOLED_FUND');
}

export async function loadPooledWorkspace(spaceId: string) {
  if (!uuid.safeParse(spaceId).success) throw new ApiError(404, 'SPACE_NOT_FOUND');
  const rawSpace = await authenticatedServerApi(`/spaces/${spaceId}`, { method: 'GET' });
  const space = financialSpaceSchema.parse(rawSpace);
  if (space.access !== 'PARTICIPANT' || space.mode !== 'POOLED_FUND' || !space.group_id) {
    throw new ApiError(404, 'SPACE_NOT_FOUND');
  }
  const [workspace, participants, group, members, categories, tags] = await Promise.all([
    authenticatedServerApi(`/spaces/${spaceId}/pooled-funds/workspace`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/participants`, { method: 'GET' }),
    authenticatedServerApi(`/groups/${space.group_id}`, { method: 'GET' }),
    authenticatedServerApi(`/groups/${space.group_id}/members`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/taxonomy?kind=CATEGORY&include_inactive=true`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/taxonomy?kind=TAG&include_inactive=true`, { method: 'GET' }),
  ]);
  const categoryPicker = taxonomyPickerSchema.parse(categories);
  const tagPicker = taxonomyPickerSchema.parse(tags);
  return {
    space,
    workspace: pooledWorkspaceSchema.parse(workspace),
    participants: sharedParticipantSchema.array().parse(participants),
    group: groupDetailSchema.parse(group),
    members: memberSchema.array().parse(members),
    terms: [...categoryPicker.terms, ...tagPicker.terms],
  };
}

export type PooledWorkspaceData = Awaited<ReturnType<typeof loadPooledWorkspace>>;
