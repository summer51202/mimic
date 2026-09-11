import { Prisma } from '@prisma/client';
import { TaxonomyService } from './taxonomy.service';
import { PrismaService } from '../prisma/prisma.service';
import { FinancialSpacesService } from '../financial-spaces/financial-spaces.service';
describe('taxonomy configuration', () => {
  it('reports a missing system default as configuration failure rather than bad user input', async () => {
    const tx = { taxonomyTerm: { findMany: jest.fn().mockResolvedValue([]) } } as unknown as Prisma.TransactionClient;
    const service = new TaxonomyService({} as PrismaService, {} as FinancialSpacesService);
    await expect(service.resolveSelection(tx, { groupId: null } as never, 'actor', undefined, []))
      .rejects.toThrow('SYSTEM_TAXONOMY_MISSING');
  });
});
