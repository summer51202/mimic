import { describe, expect, it } from 'vitest';
import { shouldReloadForControllerChange } from './register-service-worker';

describe('service worker controller changes', () => {
  it('does not reload when the first installed worker claims an uncontrolled page', () => {
    expect(shouldReloadForControllerChange(false, false)).toBe(false);
  });

  it('reloads only an existing controlled page with no dirty form', () => {
    expect(shouldReloadForControllerChange(true, false)).toBe(true);
    expect(shouldReloadForControllerChange(true, true)).toBe(false);
  });
});
