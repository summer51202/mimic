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

  it('stores private shared-expense references without duplicating expense records', () => {
    const migration = readFileSync(
      join(
        __dirname,
        '20260912000100_personal_shared_references',
        'migration.sql',
      ),
      'utf8',
    );

    expect(migration).toContain('CREATE TABLE "personal_expense_references"');
    expect(migration).toContain('CREATE TABLE "personal_expense_reference_tags"');
    expect(migration).toContain('CREATE TABLE "personal_reference_receipts"');
    expect(migration).toContain(
      'UNIQUE ("personal_space_id", "source_expense_id", "owner_user_id")',
    );
    expect(migration).toContain(
      'FOREIGN KEY ("source_expense_id") REFERENCES "expense_records"("id") ON DELETE RESTRICT',
    );
    expect(migration).not.toContain('INSERT INTO "expense_records"');
  });
});
