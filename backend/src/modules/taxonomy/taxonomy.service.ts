import { BadRequestException, ConflictException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { FinancialSpace, Prisma, TaxonomyAction, TaxonomyTerm } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { lockGroupMutation } from '../prisma/group-mutation-lock';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
import { canMerge, normalizeTermName, rankTermIds, resolveCanonical } from './taxonomy-policy';
import { CreateTaxonomyDto, MergeTaxonomyDto, RenameTaxonomyDto, TaxonomyQueryDto } from './dto/taxonomy.dto';
import { TaxonomyPickerResult, TaxonomyTermProjection } from './taxonomy.types';
import { UNCATEGORIZED_ID } from './system-taxonomy';

@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService, private readonly spaces: FinancialSpacesService) {}

  async lockScope(tx: Prisma.TransactionClient, actorId: string, groupId: string | null): Promise<void> {
    if (groupId) await lockGroupMutation(tx, groupId);
    else await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`taxonomy:PERSONAL:${actorId}`},0))`);
  }
  private scopeKey(actorId: string, groupId: string | null): string {
    return groupId ? `GROUP:${groupId}` : `PERSONAL:${actorId}`;
  }
  private async requireScope(tx: Prisma.TransactionClient, actorId: string, groupId: string | null) {
    if (groupId) return this.spaces.requireGroupMember(tx, groupId, actorId);
    if (!await tx.user.findFirst({ where: { id: actorId, status: 'ACTIVE' }, select: { id: true } })) {
      throw new NotFoundException('TAXONOMY_NOT_FOUND');
    }
    return null;
  }
  private async terms(tx: Prisma.TransactionClient, actorId: string, groupId: string | null) {
    return tx.taxonomyTerm.findMany({ where: { scopeKey: { in: ['SYSTEM', this.scopeKey(actorId, groupId)] } }, orderBy: { id: 'asc' } });
  }
  private project(term: TaxonomyTerm, all: TaxonomyTerm[], locale = 'zh-TW'): TaxonomyTermProjection {
    const translations = term.translations;
    const localized = translations && typeof translations === 'object' && !Array.isArray(translations) ? translations[locale] : null;
    return { id: term.id, kind: term.kind, scope: term.scope, name: typeof localized === 'string' ? localized : term.name,
      status: term.status, canonical_id: resolveCanonical(term.id, new Map(all.map(item => [item.id, item]))), version: term.version };
  }
  list(actorId: string, groupId: string | null, query: TaxonomyQueryDto): Promise<TaxonomyTermProjection[]> {
    return this.prisma.$transaction(async tx => {
      await this.requireScope(tx, actorId, groupId);
      const all = await this.terms(tx, actorId, groupId);
      return all.filter(term => term.kind === query.kind && (query.include_inactive === 'true' || term.status === 'ACTIVE'))
        .map(term => this.project(term, all, query.locale));
    }, { isolationLevel: 'RepeatableRead' });
  }
  create(actorId: string, groupId: string | null, dto: CreateTaxonomyDto) {
    return this.mutate(actorId, groupId, async tx => {
      const term = await tx.taxonomyTerm.create({ data: {
        kind: dto.kind, scope: groupId ? 'GROUP' : 'PERSONAL', scopeKey: this.scopeKey(actorId, groupId),
        ownerUserId: groupId ? null : actorId, groupId, createdById: actorId,
        name: dto.name, normalizedName: this.normalize(dto.name),
      } });
      const after = this.project(term, [term]);
      await this.audit(tx, term.id, actorId, 'CREATE', null, after);
      return after;
    });
  }
  rename(actorId: string, groupId: string | null, id: string, dto: RenameTaxonomyDto) {
    return this.mutate(actorId, groupId, async tx => {
      const { term, all } = await this.managed(tx, actorId, groupId, id);
      this.version(term, dto.version);
      if (term.status !== 'ACTIVE') throw new ConflictException('TAXONOMY_INACTIVE');
      if (term.name === dto.name) return this.project(term, all);
      const updated = await tx.taxonomyTerm.update({ where: { id }, data: { name: dto.name, normalizedName: this.normalize(dto.name), version: { increment: 1 } } });
      const after = this.project(updated, all);
      await this.audit(tx, id, actorId, 'RENAME', this.project(term, all), after);
      return after;
    });
  }
  archive(actorId: string, groupId: string | null, id: string, version: number) {
    return this.mutate(actorId, groupId, async tx => {
      const { term, all } = await this.managed(tx, actorId, groupId, id);
      if (term.status === 'ARCHIVED') return this.project(term, all);
      this.version(term, version);
      if (term.status !== 'ACTIVE') throw new ConflictException('TAXONOMY_INACTIVE');
      const updated = await tx.taxonomyTerm.update({ where: { id }, data: { status: 'ARCHIVED', version: { increment: 1 } } });
      const after = this.project(updated, all);
      await this.audit(tx, id, actorId, 'ARCHIVE', this.project(term, all), after);
      return after;
    });
  }
  merge(actorId: string, groupId: string | null, id: string, dto: MergeTaxonomyDto) {
    return this.mutate(actorId, groupId, async tx => {
      const { term, all } = await this.managed(tx, actorId, groupId, id);
      const map = new Map(all.map(item => [item.id, item]));
      const selected = map.get(dto.target_id);
      if (!selected) throw new NotFoundException('TAXONOMY_NOT_FOUND');
      const target = map.get(resolveCanonical(selected.id, map))!;
      if (term.status === 'MERGED' && resolveCanonical(term.id, map) === target.id) return this.project(term, all);
      this.version(term, dto.version);
      this.version(selected, dto.target_version);
      if (!canMerge(term, target)) throw new ConflictException('TAXONOMY_MERGE_INVALID');
      const updated = await tx.taxonomyTerm.update({ where: { id }, data: { status: 'MERGED', mergedIntoId: target.id, version: { increment: 1 } } });
      const after = this.project(updated, all.map(item => item.id === id ? updated : item));
      await this.audit(tx, id, actorId, 'MERGE', this.project(term, all), after);
      return after;
    });
  }
  private async managed(tx: Prisma.TransactionClient, actorId: string, groupId: string | null, id: string) {
    const all = await this.terms(tx, actorId, groupId);
    const term = all.find(item => item.id === id);
    if (!term) throw new NotFoundException('TAXONOMY_NOT_FOUND');
    if (term.scope === 'SYSTEM') throw new ForbiddenException('SYSTEM_TAXONOMY_IMMUTABLE');
    if (groupId && term.createdById !== actorId) {
      const member = await this.spaces.requireGroupMember(tx, groupId, actorId);
      if (member.role !== 'OWNER') throw new ForbiddenException('TAXONOMY_MANAGER_REQUIRED');
    }
    return { term, all };
  }
  private async mutate<T>(actorId: string, groupId: string | null, operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(async tx => {
        await this.lockScope(tx, actorId, groupId);
        await this.requireScope(tx, actorId, groupId);
        return operation(tx);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('TAXONOMY_NAME_EXISTS');
      throw error;
    }
  }
  private version(term: TaxonomyTerm, version: number) {
    if (term.version !== version) throw new ConflictException('TAXONOMY_VERSION_CONFLICT');
  }
  private normalize(name: string) {
    try { return normalizeTermName(name); } catch { throw new BadRequestException('TAXONOMY_NAME_INVALID'); }
  }
  private async audit(tx: Prisma.TransactionClient, termId: string, actorUserId: string, action: TaxonomyAction, before: object | null, after: object) {
    await tx.taxonomyAuditEvent.create({ data: { termId, actorUserId, action,
      before: before === null ? Prisma.DbNull : JSON.parse(JSON.stringify(before)), after: JSON.parse(JSON.stringify(after)),
    } });
  }

  async resolveSelection(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string, categoryId: string | undefined,
    tagIds: string[], previous?: { categoryId: string; tagIds: string[] }) {
    const all = await this.terms(tx, actorId, space.groupId);
    const map = new Map(all.map(term => [term.id, term]));
    const resolve = (id: string, kind: 'CATEGORY' | 'TAG', retained: boolean) => {
      const term = map.get(id);
      if (!term || term.kind !== kind) throw new BadRequestException('TAXONOMY_SELECTION_INVALID');
      if (retained) return id;
      const target = map.get(resolveCanonical(id, map))!;
      if (target.status !== 'ACTIVE') throw new BadRequestException('TAXONOMY_SELECTION_INVALID');
      return target.id;
    };
    const requested = categoryId ?? UNCATEGORIZED_ID;
    if (requested === UNCATEGORIZED_ID && (!map.has(requested) || map.get(requested)!.status !== 'ACTIVE')) {
      throw new InternalServerErrorException('SYSTEM_TAXONOMY_MISSING');
    }
    return { categoryId: resolve(requested, 'CATEGORY', previous?.categoryId === requested),
      tagIds: [...new Set(tagIds.map(id => resolve(id, 'TAG', previous?.tagIds.includes(id) ?? false)))],
    };
  }

  async resolveTags(tx: Prisma.TransactionClient, space: FinancialSpace, actorId: string,
    tagIds: string[], previousTagIds: string[] = []): Promise<string[]> {
    return (await this.resolveSelection(tx, space, actorId, undefined, tagIds,
      { categoryId: UNCATEGORIZED_ID, tagIds: previousTagIds })).tagIds;
  }

  listForSpace(spaceId: string, actorId: string, query: TaxonomyQueryDto): Promise<TaxonomyPickerResult> {
    return this.prisma.$transaction(async tx => {
      const { space } = await this.spaces.requireParticipant(tx, spaceId, actorId);
      const all = await this.terms(tx, actorId, space.groupId);
      const map = new Map(all.map(term => [term.id, term]));
      const search = query.q?.trim().normalize('NFKC').toLocaleLowerCase('en-US') ?? '';
      const available = all.filter(term => term.kind === query.kind && term.status === 'ACTIVE')
        .map(term => this.project(term, all, query.locale))
        .filter(term => term.name.toLocaleLowerCase('en-US').includes(search) || map.get(term.id)!.name.toLocaleLowerCase('en-US').includes(search));
      const eligible = new Set(available.map(term => term.id));
      const canonical = (ids: string[]) => [...new Set(ids.filter(id => map.has(id)).map(id => resolveCanonical(id, map)))].filter(id => eligible.has(id));
      const records = await tx.expenseRecord.findMany({ where: { spaceId, createdById: actorId, status: 'ACTIVE' }, select: { categoryId: true, tags: { select: { tagId: true } } } });
      const counts = new Map<string, number>();
      for (const record of records) for (const id of canonical(query.kind === 'CATEGORY' ? [record.categoryId] : record.tags.map(tag => tag.tagId))) counts.set(id, (counts.get(id) ?? 0) + 1);
      const frequent = [...counts.keys()].sort((a, b) => counts.get(b)! - counts.get(a)! || a.localeCompare(b)).slice(0, 5);
      const events = await tx.spaceAuditEvent.findMany({ where: { spaceId, actorUserId: actorId, action: { in: ['EXPENSE_CREATED', 'EXPENSE_UPDATED'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { after: true } });
      const recentRaw: string[] = [];
      for (const event of events) {
        const after = event.after;
        if (!after || typeof after !== 'object' || Array.isArray(after)) continue;
        if (query.kind === 'CATEGORY' && typeof after.category_id === 'string') recentRaw.push(after.category_id);
        if (query.kind === 'TAG' && Array.isArray(after.tag_ids)) recentRaw.push(...after.tag_ids.filter((id): id is string => typeof id === 'string'));
      }
      const recent = canonical(recentRaw).slice(0, 5);
      const category = query.category_id && map.has(query.category_id) ? map.get(resolveCanonical(query.category_id, map)) : undefined;
      const context = all.filter(term => eligible.has(term.id) && category?.systemKey && term.categoryKeys.includes(category.systemKey)).map(term => term.id);
      const order = rankTermIds(recent, frequent, context, available.map(term => term.id));
      const projections = new Map(available.map(term => [term.id, term]));
      return { terms: order.map(id => projections.get(id)!), recent_ids: recent, frequent_ids: frequent, context_ids: context };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
