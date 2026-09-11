import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';

const css = () => readFileSync(resolve(process.cwd(), 'src/features/personal-expenses/personal.css'), 'utf8');

it('keeps private reference tickets and controls usable at narrow widths', () => {
  const source = css();
  expect(source).toContain('.personal-source-badge');
  expect(source).toMatch(/\.personal-source-badge[^}]*border[^}]*dashed/);
  expect(source).toMatch(/\.personal-reference-tags input[^}]*width:\s*1\.5rem[^}]*height:\s*1\.5rem/);
  expect(source).toMatch(/@media\s*\(max-width:\s*40rem\)[\s\S]*\.personal-record-actions/);
  expect(source).toMatch(/\.personal-reference-form[^}]*min-width:\s*0/);
});
