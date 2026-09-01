import { generateMimicId, MIMIC_ID_PATTERN } from './mimic-id';

describe('generateMimicId', () => {
  it('creates public IDs in the unambiguous canonical format', () => {
    const ids = Array.from({ length: 128 }, () => generateMimicId());

    expect(ids.every((id) => MIMIC_ID_PATTERN.test(id))).toBe(true);
    expect(ids.every((id) => !/[01IO]/.test(id.slice('MIMIC-'.length)))).toBe(
      true,
    );
    expect(new Set(ids).size).toBe(ids.length);
  });
});
