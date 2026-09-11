import { CATEGORY_CATALOG, TAG_CATALOG, UNCATEGORIZED_ID } from './system-taxonomy';
describe('stable system taxonomy', () => {
  it('provides sixteen localized categories and a stable fallback', () => {
    expect(CATEGORY_CATALOG).toHaveLength(16);
    expect(CATEGORY_CATALOG.find(term => term.systemKey === 'category.uncategorized')?.id).toBe(UNCATEGORIZED_ID);
    expect(UNCATEGORIZED_ID).toBe('20000000-0000-4000-8000-000000000016');
    for (const term of CATEGORY_CATALOG) {
      expect(term.translations['zh-TW']).toBeTruthy();
      expect(term.translations.en).toBeTruthy();
    }
  });
  it('provides contextual tags with unique identities and valid category references', () => {
    expect(TAG_CATALOG).toHaveLength(15);
    const all = [...CATEGORY_CATALOG, ...TAG_CATALOG];
    expect(new Set(all.map(term => term.id)).size).toBe(31);
    expect(new Set(all.map(term => term.systemKey)).size).toBe(31);
    const keys = new Set(CATEGORY_CATALOG.map(term => term.systemKey));
    for (const tag of TAG_CATALOG) for (const key of tag.categoryKeys) expect(keys.has(key)).toBe(true);
    expect(TAG_CATALOG.find(term => term.systemKey === 'tag.coffee')?.categoryKeys).toContain('category.food');
  });
});
