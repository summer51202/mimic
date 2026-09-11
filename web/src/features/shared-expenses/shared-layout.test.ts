import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('shared workspace responsive contract', () => {
  it('loads shared styles on both the group entry point and participant-private workspace', () => {
    expect(source('src/app/app/groups/[groupId]/page.tsx')).toContain("import '@/features/shared-expenses/shared.css'");
    expect(source('src/app/app/spaces/[spaceId]/page.tsx')).toContain("import '@/features/shared-expenses/shared.css'");
  });

  it('keeps controls, dense trails, and dialogs usable at narrow viewports', () => {
    const css = source('src/features/shared-expenses/shared.css');

    expect(css).toContain('.shared-page .pixel-button');
    expect(css).toMatch(/min-height:\s*2\.75rem/);
    expect(css).toContain('.settlement-trail');
    expect(css).toContain('.shared-participant-list');
    expect(css).toContain('overflow-wrap: anywhere');
    expect(css).toContain('max-height: calc(100dvh - 2rem)');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('@media (min-width: 641px) and (max-width: 960px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
