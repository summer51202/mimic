import { createHash } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PersonalReferenceAction, Prisma } from '@prisma/client';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { lockFinancialSpace } from '../financial-spaces/financial-space-lock';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import {
  CreatePersonalReferenceDto,
  RemovePersonalReferenceDto,
  UpdatePersonalReferenceDto,
} from './dto/personal-reference.dto';
import {
  personalReferenceInclude,
  PersonalReferenceMutationResult,
  PersonalReferenceRecord,
  projectPersonalReference,
} from './personal-reference-projection';
import { referenceAllocation, referenceDelta } from './personal-reference-policy';

type ReferenceDto = CreatePersonalReferenceDto | UpdatePersonalReferenceDto | RemovePersonalReferenceDto;

@Injectable()
export class PersonalReferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spaces: FinancialSpacesService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  async create(personalSpaceId: string, actorId: string, dto: CreatePersonalReferenceDto) {
    const source = await this.prisma.expenseRecord.findUnique({
      where: { id: dto.source_expense_id },
      select: { spaceId: true, space: { select: { groupId: true } } },
    });
    if (!source) throw new NotFoundException('SOURCE_EXPENSE_NOT_FOUND');
    return this.write(personalSpaceId, actorId, source.spaceId, source.space.groupId, null, 'CREATE', dto);
  }

  async update(personalSpaceId: string, referenceId: string, actorId: string, dto: UpdatePersonalReferenceDto) {
    const identity = await this.referenceIdentity(personalSpaceId, referenceId, actorId);
    return this.write(personalSpaceId, actorId, identity.sourceExpense.spaceId,
      identity.sourceExpense.space.groupId, referenceId, 'UPDATE', dto);
  }

  async remove(personalSpaceId: string, referenceId: string, actorId: string, dto: RemovePersonalReferenceDto) {
    const identity = await this.referenceIdentity(personalSpaceId, referenceId, actorId);
    return this.write(personalSpaceId, actorId, identity.sourceExpense.spaceId,
      identity.sourceExpense.space.groupId, referenceId, 'REMOVE', dto);
  }

  private async referenceIdentity(personalSpaceId: string, referenceId: string, actorId: string) {
    const identity = await this.prisma.personalExpenseReference.findFirst({
      where: { id: referenceId, personalSpaceId, ownerUserId: actorId },
      select: { sourceExpense: { select: { spaceId: true, space: { select: { groupId: true } } } } },
    });
    if (!identity) throw new NotFoundException('PERSONAL_REFERENCE_NOT_FOUND');
    return identity;
  }

  private payload(action: PersonalReferenceAction, referenceId: string | null, dto: ReferenceDto) {
    return {
      action,
      reference_id: referenceId,
      source_expense_id: 'source_expense_id' in dto ? dto.source_expense_id : null,
      version: 'version' in dto ? dto.version : null,
      tag_ids: 'tag_ids' in dto && dto.tag_ids ? [...dto.tag_ids].sort() : null,
      note: 'note' in dto ? dto.note ?? null : null,
    };
  }

  private write(
    personalSpaceId: string,
    actorId: string,
    sourceSpaceId: string,
    sourceGroupId: string | null,
    referenceId: string | null,
    action: PersonalReferenceAction,
    dto: ReferenceDto,
  ): Promise<PersonalReferenceMutationResult> {
    return this.prisma.$transaction(async (tx) => {
      await lockFinancialSpace(tx, sourceSpaceId, sourceGroupId);
      await this.taxonomy.lockScope(tx, actorId, null);
      await lockFinancialSpace(tx, personalSpaceId, null);

      const { space: destination } = await this.spaces.requireParticipant(tx, personalSpaceId, actorId);
      if (destination.mode !== 'PERSONAL_EXPENSES' || destination.ownerUserId !== actorId) {
        throw new ConflictException('SPACE_MODE_MISMATCH');
      }
      const { space: sourceSpace } = await this.spaces.requireParticipant(tx, sourceSpaceId, actorId);
      if (sourceSpace.mode !== 'SHARED_EXPENSES') throw new NotFoundException('SOURCE_EXPENSE_NOT_FOUND');
      const source = await tx.expenseRecord.findFirst({
        where: { id: action === 'CREATE' ? (dto as CreatePersonalReferenceDto).source_expense_id : undefined,
          ...(action === 'CREATE' ? {} : { personalReferences: { some: { id: referenceId! } } }),
          spaceId: sourceSpaceId, status: 'ACTIVE' },
        include: { sharedAllocations: true },
      });
      if (!source) throw new NotFoundException('SOURCE_EXPENSE_NOT_FOUND');
      if (destination.currency !== sourceSpace.currency) {
        throw new ConflictException('PERSONAL_REFERENCE_CURRENCY_MISMATCH');
      }
      let allocation: bigint;
      try { allocation = referenceAllocation(source.sharedAllocations, actorId); }
      catch { throw new BadRequestException('PERSONAL_REFERENCE_ALLOCATION_REQUIRED'); }

      const payloadHash = createHash('sha256')
        .update(JSON.stringify(this.payload(action, referenceId, dto))).digest('hex');
      const receipt = await tx.personalReferenceReceipt.findUnique({
        where: { spaceId_actorUserId_requestId: {
          spaceId: personalSpaceId, actorUserId: actorId, requestId: dto.request_id,
        } },
      });
      if (receipt) {
        if (receipt.action !== action || receipt.payloadHash !== payloadHash) {
          throw new ConflictException('IDEMPOTENCY_KEY_REUSED');
        }
        return receipt.response as unknown as PersonalReferenceMutationResult;
      }
      if (destination.status !== 'ACTIVE') throw new ConflictException('SPACE_ARCHIVED');

      let current: PersonalReferenceRecord | null = null;
      if (referenceId) {
        current = await tx.personalExpenseReference.findFirst({
          where: { id: referenceId, personalSpaceId, ownerUserId: actorId },
          include: personalReferenceInclude,
        });
      } else {
        current = await tx.personalExpenseReference.findUnique({
          where: { personalSpaceId_sourceExpenseId_ownerUserId: {
            personalSpaceId, sourceExpenseId: source.id, ownerUserId: actorId,
          } },
          include: personalReferenceInclude,
        });
      }
      if (referenceId && !current) throw new NotFoundException('PERSONAL_REFERENCE_NOT_FOUND');
      if (action !== 'CREATE') {
        if (current!.status !== 'ACTIVE') throw new ConflictException('PERSONAL_REFERENCE_REMOVED');
        if (!('version' in dto) || current!.version !== dto.version) {
          throw new ConflictException('PERSONAL_REFERENCE_VERSION_CONFLICT');
        }
      } else if (current?.status === 'ACTIVE') {
        throw new ConflictException('PERSONAL_REFERENCE_EXISTS');
      }

      const previousProjection = current ? projectPersonalReference(current) : null;
      const previousAmount = current?.status === 'ACTIVE' ? allocation : null;
      let changed = true;
      let written: PersonalReferenceRecord;
      if (action === 'REMOVE') {
        written = await tx.personalExpenseReference.update({ where: { id: current!.id }, data: {
          status: 'REMOVED', version: { increment: 1 },
        }, include: personalReferenceInclude });
      } else {
        const metadata = dto as CreatePersonalReferenceDto | UpdatePersonalReferenceDto;
        const previousTags = current?.tags.map((tag) => tag.tagId) ?? [];
        const tagIds = metadata.tag_ids === undefined
          ? previousTags
          : await this.taxonomy.resolveTags(tx, destination, actorId, metadata.tag_ids, previousTags);
        const note = metadata.note === undefined ? current?.privateNote ?? null : metadata.note;
        changed = !current || current.status !== 'ACTIVE' || current.privateNote !== note
          || JSON.stringify(previousTags) !== JSON.stringify([...tagIds].sort());
        if (!current) {
          written = await tx.personalExpenseReference.create({ data: {
            personalSpaceId, sourceExpenseId: source.id, ownerUserId: actorId, privateNote: note,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
          }, include: personalReferenceInclude });
        } else if (!changed) written = current;
        else {
          written = await tx.personalExpenseReference.update({ where: { id: current.id }, data: {
            status: 'ACTIVE', privateNote: note, version: { increment: 1 },
            tags: { deleteMany: {}, create: tagIds.map((tagId) => ({ tagId })) },
          }, include: personalReferenceInclude });
        }
      }

      const projection = projectPersonalReference(written);
      const afterAmount = written.status === 'ACTIVE' ? allocation : null;
      const result = { reference: projection, change_minor: referenceDelta(previousAmount, afterAmount).toString() };
      if (changed) {
        await tx.financialSpace.update({ where: { id: personalSpaceId }, data: {
          version: { increment: 1 },
          ...(destination.firstFormalRecordAt === null ? { firstFormalRecordAt: new Date() } : {}),
        } });
        const actions = {
          CREATE: 'PERSONAL_REFERENCE_CREATED',
          UPDATE: 'PERSONAL_REFERENCE_UPDATED',
          REMOVE: 'PERSONAL_REFERENCE_REMOVED',
        } as const;
        await this.spaces.audit(tx, personalSpaceId, actorId, actions[action], previousProjection, projection);
      }
      await tx.personalReferenceReceipt.create({ data: {
        spaceId: personalSpaceId, actorUserId: actorId, requestId: dto.request_id,
        action, payloadHash, response: JSON.parse(JSON.stringify(result)),
      } });
      return result;
    });
  }
}
