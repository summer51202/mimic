import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';

const REVISION_PATTERN = /^[0-9a-f]{7,64}$/i;

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  liveness() {
    const revision = process.env.MIMIC_BACKEND_REVISION;

    return {
      ok: true,
      ...(REVISION_PATTERN.test(revision ?? '') ? { revision } : {}),
    };
  }

  async readiness() {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1 AS ok');

      const expectedMigration = process.env.MIMIC_EXPECTED_MIGRATION?.trim();
      if (expectedMigration) {
        const migrations = await this.prisma.$queryRawUnsafe<
          { migration_name: string }[]
        >(
          `SELECT migration_name
           FROM _prisma_migrations
           WHERE migration_name = $1
             AND finished_at IS NOT NULL
             AND rolled_back_at IS NULL
           LIMIT 1`,
          expectedMigration,
        );

        if (migrations.length !== 1) {
          throw new Error('expected migration is not applied');
        }
      }

      return { ok: true };
    } catch {
      throw new ServiceUnavailableException('SERVICE_NOT_READY');
    }
  }
}
