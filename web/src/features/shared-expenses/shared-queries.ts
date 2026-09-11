import 'server-only';
import { z } from 'zod';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { groupDetailSchema, memberSchema } from '@/shared/api/domain-contracts';
import { ApiError } from '@/shared/api/errors';
import {
  sharedBatchPageSchema,
  sharedCorrectionPageSchema,
  sharedExpensePageSchema,
  sharedParticipantSchema,
  sharedSummarySchema,
} from '@/shared/api/shared-finance-contracts';
import { taxonomyPickerSchema } from '@/shared/api/taxonomy-contracts';
import { taxonomyTermSchema } from '@/shared/api/taxonomy-contracts';

const uuid = z.string().uuid();

export async function listGroupSharedSpaces(groupId: string) {
  if (!uuid.safeParse(groupId).success) throw new ApiError(404, 'GROUP_NOT_FOUND');
  const raw = await authenticatedServerApi(`/groups/${groupId}/spaces`, { method: 'GET' });
  return financialSpaceSchema.array().parse(raw).filter(space => space.mode === 'SHARED_EXPENSES');
}

export async function loadSharedWorkspace(spaceId: string) {
  if (!uuid.safeParse(spaceId).success) throw new ApiError(404, 'SPACE_NOT_FOUND');
  const rawSpace = await authenticatedServerApi(`/spaces/${spaceId}`, { method: 'GET' });
  const space = financialSpaceSchema.parse(rawSpace);
  if (space.access !== 'PARTICIPANT' || space.mode !== 'SHARED_EXPENSES' || !space.group_id) {
    throw new ApiError(404, 'SPACE_NOT_FOUND');
  }
  const groupId = space.group_id;
  const [participants, group, members, categories, tags, expenses, summary, batches, corrections, personalSpaces, personalTags] = await Promise.all([
    authenticatedServerApi(`/spaces/${spaceId}/participants`, { method: 'GET' }),
    authenticatedServerApi(`/groups/${groupId}`, { method: 'GET' }),
    authenticatedServerApi(`/groups/${groupId}/members`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/taxonomy?kind=CATEGORY&include_inactive=true`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/taxonomy?kind=TAG&include_inactive=true`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/shared-expenses`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/shared-expenses/summary`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/shared-settlements`, { method: 'GET' }),
    authenticatedServerApi(`/spaces/${spaceId}/shared-corrections`, { method: 'GET' }),
    authenticatedServerApi('/me/spaces', { method: 'GET' }),
    authenticatedServerApi('/me/taxonomy?kind=TAG&include_inactive=true', { method: 'GET' }),
  ]);
  const categoryPicker = taxonomyPickerSchema.parse(categories);
  const tagPicker = taxonomyPickerSchema.parse(tags);
  return {
    space,
    participants: sharedParticipantSchema.array().parse(participants),
    group: groupDetailSchema.parse(group),
    members: memberSchema.array().parse(members),
    terms: [...categoryPicker.terms, ...tagPicker.terms],
    expenses: sharedExpensePageSchema.parse(expenses),
    summary: sharedSummarySchema.parse(summary),
    batches: sharedBatchPageSchema.parse(batches),
    corrections: sharedCorrectionPageSchema.parse(corrections),
    personalSpaces: financialSpaceSchema.array().parse(personalSpaces).flatMap(item => item.access === 'PARTICIPANT'
      && item.mode === 'PERSONAL_EXPENSES' && item.status === 'ACTIVE' && item.currency === space.currency ? [item] : []),
    personalTags: taxonomyTermSchema.array().parse(personalTags),
  };
}

export type SharedWorkspaceData = Awaited<ReturnType<typeof loadSharedWorkspace>>;
