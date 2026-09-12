import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('pooled responsive and accessible layout contract', () => {
  const css = readFileSync(join(process.cwd(), 'src/features/pooled-funds/pooled.css'), 'utf8');
  it('keeps actions wrapped, dialogs viewport-bound and mobile content in one column', () => {
    expect(css).toContain('flex-wrap: wrap');
    expect(css).toContain('max-height: calc(100dvh - 1rem)');
    expect(css).toContain('max-width: calc(100vw - 1rem)');
    expect(css).toContain('grid-template-columns: minmax(0, 1fr)');
    expect(css).toContain('min-width: 0');
  });
  it('honors reduced motion', () => {
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
  });
});
