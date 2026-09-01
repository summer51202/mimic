import { randomBytes } from 'node:crypto';

const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export const MIMIC_ID_PATTERN =
  /^MIMIC-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{4}$/;

export function generateMimicId(): string {
  const bytes = randomBytes(8);
  const body = Array.from(bytes, (byte) => alphabet[byte & 31]).join('');

  return `MIMIC-${body.slice(0, 4)}-${body.slice(4)}`;
}
