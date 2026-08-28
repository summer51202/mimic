import { ServiceUnavailableException } from '@nestjs/common';
import { HealthService } from './health.service';

describe('HealthService', () => {
  const originalRevision = process.env.MIMIC_BACKEND_REVISION;
  const originalExpectedMigration = process.env.MIMIC_EXPECTED_MIGRATION;

  afterEach(() => {
    if (originalRevision === undefined) {
      delete process.env.MIMIC_BACKEND_REVISION;
    } else {
      process.env.MIMIC_BACKEND_REVISION = originalRevision;
    }

    if (originalExpectedMigration === undefined) {
      delete process.env.MIMIC_EXPECTED_MIGRATION;
    } else {
      process.env.MIMIC_EXPECTED_MIGRATION = originalExpectedMigration;
    }
  });

  it('reports readiness after a database probe succeeds', async () => {
    const query = jest.fn().mockResolvedValueOnce([{ ok: 1 }]);
    const service = new HealthService({ $queryRawUnsafe: query } as never);

    await expect(service.readiness()).resolves.toEqual({ ok: true });
    expect(query).toHaveBeenCalledWith('SELECT 1 AS ok');
  });

  it('requires the configured migration to be applied', async () => {
    process.env.MIMIC_EXPECTED_MIGRATION = '20260828120000_safety';
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ ok: 1 }])
      .mockResolvedValueOnce([{ migration_name: '20260828120000_safety' }]);
    const service = new HealthService({ $queryRawUnsafe: query } as never);

    await expect(service.readiness()).resolves.toEqual({ ok: true });
    expect(query).toHaveBeenLastCalledWith(
      expect.stringContaining('migration_name = $1'),
      '20260828120000_safety',
    );
  });

  it('reports unavailable when the database probe fails', async () => {
    const service = new HealthService({
      $queryRawUnsafe: jest.fn().mockRejectedValue(new Error('database password')),
    } as never);

    await expect(service.readiness()).rejects.toEqual(
      new ServiceUnavailableException('SERVICE_NOT_READY'),
    );
  });

  it('reports unavailable when the configured migration is absent or unfinished', async () => {
    process.env.MIMIC_EXPECTED_MIGRATION = '20260828120000_safety';
    const service = new HealthService({
      $queryRawUnsafe: jest.fn().mockResolvedValueOnce([{ ok: 1 }]).mockResolvedValueOnce([]),
    } as never);

    await expect(service.readiness()).rejects.toEqual(
      new ServiceUnavailableException('SERVICE_NOT_READY'),
    );
  });

  it('exposes only valid git SHA revisions through liveness', () => {
    process.env.MIMIC_BACKEND_REVISION = 'd329f3cecada42155424a7ec8a5de23336d39111';
    const service = new HealthService({} as never);

    expect(service.liveness()).toEqual({
      ok: true,
      revision: 'd329f3cecada42155424a7ec8a5de23336d39111',
    });
  });

  it.each([undefined, 'not-a-revision', 'token=do-not-expose']) (
    'omits missing, invalid, and secret-like revisions from liveness',
    (revision) => {
      if (revision === undefined) {
        delete process.env.MIMIC_BACKEND_REVISION;
      } else {
        process.env.MIMIC_BACKEND_REVISION = revision;
      }
      const service = new HealthService({} as never);

      expect(service.liveness()).toEqual({ ok: true });
    },
  );
});
