import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('ships no legacy Fund product routes, BFF handlers, or feature modules', () => {
  const root = process.cwd();
  const removed = [
    'src/app/app/funds/page.tsx',
    'src/app/app/activity/page.tsx',
    'src/app/app/groups/[groupId]/funds/new/page.tsx',
    'src/app/api/app/funds/[fundId]/summary/route.ts',
    'src/app/api/app/groups/[groupId]/funds/route.ts',
    'src/features/funds/fund-list.tsx',
    'src/features/activity/activity-page.tsx',
    'src/features/groups/treasury-dashboard.tsx',
  ];
  expect(removed.filter(path => existsSync(join(root, path)))).toEqual([]);
});
