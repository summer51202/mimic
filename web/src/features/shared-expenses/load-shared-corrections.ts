import { sharedCorrectionPageSchema, type SharedCorrection } from '@/shared/api/shared-finance-contracts';

export async function loadSharedCorrections(fetchPage: (suffix: string) => Promise<unknown>) {
  const items: SharedCorrection[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;
  do {
    const suffix: string = cursor ? '?' + new URLSearchParams({ cursor }) : '';
    const page = sharedCorrectionPageSchema.parse(await fetchPage(suffix));
    items.push(...page.items);
    cursor = page.next_cursor;
    if (cursor) {
      if (seen.has(cursor)) throw new Error('Repeated shared correction cursor');
      seen.add(cursor);
    }
  } while (cursor);
  return { items, next_cursor: null };
}
