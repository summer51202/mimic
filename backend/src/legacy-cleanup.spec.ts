import { existsSync } from 'node:fs';
import { join } from 'node:path';

describe('legacy Fund backend cleanup', () => {
  it('removes the obsolete product modules while retaining financial-space modules', () => {
    const root = process.cwd();
    expect(['funds/funds.module.ts', 'contributions/contributions.module.ts', 'expenses/expenses.module.ts',
      'settlements/settlements.module.ts']
      .filter(name => existsSync(join(root, 'src', 'modules', name)))).toEqual([]);
    expect(existsSync(join(root, 'src', 'modules', 'financial-spaces'))).toBe(true);
    expect(existsSync(join(root, 'src', 'modules', 'pooled-funds'))).toBe(true);
    expect(existsSync(join(root, 'src', 'modules', 'accounting', 'accounting-calculator.ts'))).toBe(true);
  });
});
