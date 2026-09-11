import 'server-only';
import { z } from 'zod';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { personalMonthSchema } from '@/shared/api/personal-expense-contracts';
import { taxonomyTermSchema } from '@/shared/api/taxonomy-contracts';
import { ApiError } from '@/shared/api/errors';
export async function loadPersonalPage(params: { space?: string; month?: string }) {
  const spaces = financialSpaceSchema.array().parse(await authenticatedServerApi('/me/spaces', { method: 'GET' }));
  if (params.space && !z.string().uuid().safeParse(params.space).success) throw new ApiError(404, 'SPACE_NOT_FOUND');
  const selected = params.space ? spaces.find(space => space.id === params.space) : spaces.find(space => space.status === 'ACTIVE') ?? spaces[0];
  if (params.space && !selected) throw new ApiError(404, 'SPACE_NOT_FOUND');
  if (!selected) return { spaces, selected: null, monthData: null, terms: [] };
  if (selected.access !== 'PARTICIPANT' || selected.mode !== 'PERSONAL_EXPENSES') throw new ApiError(404, 'SPACE_NOT_FOUND');
  const parts = new Intl.DateTimeFormat('en', { timeZone: selected.timezone, year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  const month = params.month ?? `${parts.find(p => p.type === 'year')!.value}-${parts.find(p => p.type === 'month')!.value}`;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new ApiError(400, 'EXPENSE_MONTH_INVALID');
  const [rawMonth, categories, tags] = await Promise.all([
    authenticatedServerApi(`/spaces/${selected.id}/personal-expenses?month=${month}`, { method: 'GET' }),
    authenticatedServerApi('/me/taxonomy?kind=CATEGORY&include_inactive=true', { method: 'GET' }),
    authenticatedServerApi('/me/taxonomy?kind=TAG&include_inactive=true', { method: 'GET' }),
  ]);
  return { spaces, selected, monthData: personalMonthSchema.parse(rawMonth), terms: [...taxonomyTermSchema.array().parse(categories), ...taxonomyTermSchema.array().parse(tags)] };
}
export type PersonalPageData = Awaited<ReturnType<typeof loadPersonalPage>>;
