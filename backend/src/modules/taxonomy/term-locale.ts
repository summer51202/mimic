import type { TaxonomyTerm } from '@prisma/client';

export const USER_LOCALES = ['zh-TW', 'en', 'ja'] as const;

type LocaleReader = {
  user: {
    findUnique(args: { where: { id: string }; select: { locale: true } }): Promise<{ locale: string | null } | null>;
  };
};

export async function resolveUserLocale(tx: LocaleReader, userId: string) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { locale: true } });
  return USER_LOCALES.find(locale => locale === user?.locale) ?? 'zh-TW';
}

export function localizedTermName(term: Pick<TaxonomyTerm, 'name' | 'translations'>, locale: string): string {
  const { translations } = term;
  const localized = translations && typeof translations === 'object' && !Array.isArray(translations)
    ? translations[locale] : null;
  return typeof localized === 'string' ? localized : term.name;
}
