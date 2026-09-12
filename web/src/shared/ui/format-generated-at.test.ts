import { describe, expect, it } from 'vitest';
import { formatGeneratedAt } from './format-generated-at';

describe('formatGeneratedAt', () => {
  it('formats an API instant without runtime locale differences', () => {
    expect(formatGeneratedAt('2026-09-12T07:08:09.123Z')).toBe('2026-09-12 07:08 UTC');
  });
});
