import { Prisma } from '@prisma/client';

export const personalReferenceInclude = { tags: true } as const;
export type PersonalReferenceRecord = Prisma.PersonalExpenseReferenceGetPayload<{
  include: typeof personalReferenceInclude;
}>;

export interface PersonalReferenceProjection {
  id: string;
  personal_space_id: string;
  source_expense_id: string;
  owner_user_id: string;
  note: string | null;
  tag_ids: string[];
  status: 'ACTIVE' | 'REMOVED';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalReferenceMutationResult {
  reference: PersonalReferenceProjection;
  change_minor: string;
}

export function projectPersonalReference(
  reference: PersonalReferenceRecord,
): PersonalReferenceProjection {
  return {
    id: reference.id,
    personal_space_id: reference.personalSpaceId,
    source_expense_id: reference.sourceExpenseId,
    owner_user_id: reference.ownerUserId,
    note: reference.privateNote,
    tag_ids: reference.tags.map((tag) => tag.tagId).sort(),
    status: reference.status,
    version: reference.version,
    created_at: reference.createdAt.toISOString(),
    updated_at: reference.updatedAt.toISOString(),
  };
}
