import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('Prisma migration contracts', () => {
  it('adds Mimic IDs to the physical User table created by the initial migration', () => {
    const migration = readFileSync(
      join(
        __dirname,
        '20260902010000_add_user_mimic_id',
        'migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('ALTER TABLE "User" ADD COLUMN "mimic_id"');
    expect(migration).toContain('FROM "User"');
    expect(migration).toContain('UPDATE "User"');
    expect(migration).not.toContain('"users"');
  });
});
