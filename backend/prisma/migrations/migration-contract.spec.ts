import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CATEGORY_CATALOG, TAG_CATALOG } from '../../src/modules/taxonomy/system-taxonomy';

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

  it('persists pooled commitments, money facts, workflows, and transition uniqueness', () => {
    const migration = readFileSync(
      join(__dirname, '20260912000200_pooled_funds', 'migration.sql'),
      'utf8',
    );

    expect(migration).toContain('ALTER TYPE "FinancialSpaceStatus" ADD VALUE \'CLOSING\'');
    expect(migration).toContain('CREATE TABLE "pooled_commitments"');
    expect(migration).toContain('CREATE TABLE "pooled_commitment_assignments"');
    expect(migration).toContain('CREATE TABLE "pooled_contribution_occurrences"');
    expect(migration).toContain('CREATE TABLE "pooled_contributions"');
    expect(migration).toContain('CREATE TABLE "pooled_expense_payments"');
    expect(migration).toContain('CREATE TABLE "pooled_reimbursements"');
    expect(migration).toContain('CREATE TABLE "pooled_corrections"');
    expect(migration).toContain('CREATE TABLE "pooled_return_plans"');
    expect(migration).toContain('CREATE TABLE "pooled_returns"');
    expect(migration).toContain('CREATE TABLE "pooled_transition_postings"');
    expect(migration).toContain('CREATE TABLE "pooled_operation_receipts"');
    expect(migration).toContain('UNIQUE ("commitment_id", "participant_user_id", "due_on")');
    expect(migration).toContain('UNIQUE ("occurrence_id")');
    expect(migration).toContain('UNIQUE ("expense_id")');
    expect(migration).toContain('UNIQUE ("entity_type", "entity_id", "transition")');
    expect(migration).toContain('WHERE "status" = \'ACTIVE\'');
  });

  it('allows closing pooled spaces without marking them archived', () => {
    const migration = readFileSync(
      join(__dirname, '20260912000300_pooled_closing_constraint', 'migration.sql'),
      'utf8',
    );

    expect(migration).toContain('DROP CONSTRAINT "space_archive_check"');
    expect(migration).toContain("status IN ('ACTIVE', 'CLOSING')");
    expect(migration).toContain("status = 'ARCHIVED'");
  });
  // Phase 2I-2S. Railway databases are built only by `prisma migrate deploy`, so system taxonomy must come
  // from migrations, not from prisma/seed.ts. NEVER edit a deployed taxonomy migration: when the catalog in
  // src/modules/taxonomy/system-taxonomy.ts changes (for example 2I-b adding `ja`), add a NEW migration with
  // the same `INSERT ... ON CONFLICT ("system_key") DO UPDATE` shape. This test folds every such migration
  // in order and requires the final result to equal the catalog column by column.
  it('writes the system taxonomy catalog exactly through migrations', () => {
    type Row = { id: string; kind: string; scope: string; scopeKey: string; systemKey: string; name: string;
      normalizedName: string; translations: Record<string, string>; categoryKeys: string[]; status: string; version: number };
    const sqlValue = (token: string): unknown => {
      const text = token.trim();
      const literal = (raw: string) => raw.slice(1, -1).replaceAll("''", "'");
      if (/^'.*'::JSONB$/s.test(text)) return JSON.parse(literal(text.slice(0, -'::JSONB'.length)));
      const array = /^ARRAY\[(.*)\]::TEXT\[\]$/s.exec(text);
      if (array) return array[1].trim() ? splitTopLevel(array[1]).map(item => literal(item.trim())) : [];
      if (/^'.*'$/s.test(text)) return literal(text);
      if (/^\d+$/.test(text)) return Number(text);
      if (text === 'CURRENT_TIMESTAMP') return text;
      throw new Error(`Unexpected SQL value: ${text}`);
    };
    function splitTopLevel(input: string): string[] {
      const parts: string[] = []; let depth = 0; let quoted = false; let current = '';
      for (let i = 0; i < input.length; i++) {
        const char = input[i];
        if (quoted) {
          if (char === "'" && input[i + 1] === "'") { current += "''"; i++; continue; }
          if (char === "'") quoted = false;
        } else if (char === "'") quoted = true;
        else if (char === '[' || char === '(') depth++;
        else if (char === ']' || char === ')') depth--;
        else if (char === ',' && depth === 0) { parts.push(current); current = ''; continue; }
        current += char;
      }
      parts.push(current);
      return parts;
    }
    const migrations = readdirSync(__dirname, { withFileTypes: true })
      .filter(entry => entry.isDirectory()).map(entry => entry.name).sort()
      .map(name => ({ name, sql: readFileSync(join(__dirname, name, 'migration.sql'), 'utf8').replace(/\r\n/g, '\n') }))
      .filter(migration => migration.sql.includes('INSERT INTO "taxonomy_terms"') || migration.name === '20261119000200_system_taxonomy_ja');
    expect(migrations.map(migration => migration.name)).toContain('20261119000100_system_taxonomy_terms');

    const columns = ['id', 'kind', 'scope', 'scopeKey', 'systemKey', 'name', 'normalizedName', 'translations',
      'categoryKeys', 'status', 'version', 'createdAt', 'updatedAt'] as const;
    const state = new Map<string, Row>();
    for (const { name, sql } of migrations) {
      if (name === '20261119000200_system_taxonomy_ja') {
        expect(sql).toContain('UPDATE "taxonomy_terms" AS term');
        expect(sql).toContain('term."translations" IS DISTINCT FROM source.translations');
        const assignments = sql.split('SET ')[1].split('FROM ')[0];
        expect([...assignments.matchAll(/"([a-z_]+)"\s*=/g)].map(match => match[1]))
          .toEqual(['translations', 'updated_at']);
        const rows = [...sql.matchAll(/^  \('([^']+)', '((?:[^']|'')*)'::JSONB\)/gm)];
        expect(rows).toHaveLength(31);
        expect(new Set(rows.map(row => row[1])).size).toBe(31);
        for (const [, key, json] of rows) {
          expect(state.has(key)).toBe(true);
          state.get(key)!.translations = JSON.parse(json.replaceAll("''", "'"));
        }
        continue;
      }
      expect(sql).toContain('INSERT INTO "taxonomy_terms" ("id", "kind", "scope", "scope_key", "system_key", "name", "normalized_name", "translations", "category_keys", "status", "version", "created_at", "updated_at") VALUES');
      const update = /ON CONFLICT \("system_key"\) DO UPDATE SET([\s\S]*?)(WHERE[\s\S]*)?;/.exec(sql);
      expect(update).not.toBeNull();
      const assigned = [...update![1].matchAll(/"(\w+)" = /g)].map(match => match[1]);
      expect(assigned).toEqual(['name', 'normalized_name', 'translations', 'category_keys', 'updated_at']);
      expect(sql).not.toMatch(/taxonomy_audit_events/);
      const rows = sql.split('\n').filter(line => line.startsWith("('"))
        .map(line => splitTopLevel(line.replace(/,?$/, '').slice(1, -1)).map(sqlValue));
      expect(rows.length).toBeGreaterThan(0);
      for (const values of rows) {
        expect(values).toHaveLength(columns.length);
        const row = Object.fromEntries(columns.map((column, i) => [column, values[i]])) as Row & { createdAt: string; updatedAt: string };
        expect([row.createdAt, row.updatedAt, row.status, row.version]).toEqual(['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP', 'ACTIVE', 1]);
        const previous = state.get(row.systemKey);
        const { createdAt: _c, updatedAt: _u, ...term } = row;
        state.set(row.systemKey, previous
          ? { ...previous, name: term.name, normalizedName: term.normalizedName, translations: term.translations, categoryKeys: term.categoryKeys }
          : term);
        if (!previous) expect(new Set([...state.values()].map(item => item.id)).size).toBe(state.size);
        expect(name).toMatch(/^\d{14}_/);
      }
    }
    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
    expect([...state.values()].sort(byId))
      .toEqual([...CATEGORY_CATALOG, ...TAG_CATALOG].map(term => ({ ...term, status: 'ACTIVE', version: 1 })).sort(byId));
    expect(state.size).toBe(31);
  });
});
