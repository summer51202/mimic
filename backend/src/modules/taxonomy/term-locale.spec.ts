import { localizedTermName, resolveUserLocale } from './term-locale';

describe('resolveUserLocale', () => {
  it.each([
    ['zh-TW', 'zh-TW'],
    ['en', 'en'],
    ['ja', 'ja'],
    ['fr', 'zh-TW'],
    [null, 'zh-TW'],
  ])('resolves the stored locale %s to %s', async (stored, expected) => {
    const findUnique = jest.fn().mockResolvedValue({ locale: stored });
    await expect(resolveUserLocale({ user: { findUnique } }, 'actor')).resolves.toBe(expected);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 'actor' }, select: { locale: true } });
  });

  it('falls back when the user row is missing', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    await expect(resolveUserLocale({ user: { findUnique } }, 'actor')).resolves.toBe('zh-TW');
  });
});

describe('localizedTermName', () => {
  it('returns the selected translation when it is a string', () => {
    const term = { name: 'Food', translations: { 'zh-TW': '飲食', en: 'Food' } };
    expect(localizedTermName(term, 'zh-TW')).toBe('飲食');
  });

  it.each([{}, { en: 17 }, null, ['wrong'], 'wrong'])(
    'keeps the stored name when translations are %j',
    (translations) => {
      expect(localizedTermName({ name: '團購 Lunch', translations }, 'en')).toBe('團購 Lunch');
    },
  );
});
