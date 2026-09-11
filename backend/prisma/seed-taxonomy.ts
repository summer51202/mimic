import { PrismaClient } from '@prisma/client';
import { CATEGORY_CATALOG, TAG_CATALOG } from '../src/modules/taxonomy/system-taxonomy';

export async function seedTaxonomy(prisma: PrismaClient): Promise<void> {
  for (const term of [...CATEGORY_CATALOG, ...TAG_CATALOG]) {
    await prisma.taxonomyTerm.upsert({ where: { systemKey: term.systemKey }, create: term,
      update: { name: term.name, normalizedName: term.normalizedName, translations: term.translations, categoryKeys: term.categoryKeys },
    });
  }
}
