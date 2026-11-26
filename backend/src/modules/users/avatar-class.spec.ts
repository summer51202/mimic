import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AVATAR_CLASSES, toAvatarClass } from './avatar-class';

describe('avatar classes', () => {
  it('lists the eight approved classes in product order', () => {
    expect(AVATAR_CLASSES).toEqual([
      'warrior', 'mage', 'ranger', 'rogue', 'alchemist', 'bard', 'cartographer', 'physician',
    ]);
  });

  it('matches the database CHECK constraint exactly', () => {
    const sql = readFileSync(
      join(__dirname, '../../../prisma/migrations/20261125000100_user_avatar_class/migration.sql'),
      'utf8',
    );
    const listed = [...sql.split('IN (')[1].split(')')[0].matchAll(/'([a-z]+)'/g)].map((match) => match[1]);
    expect(listed).toEqual([...AVATAR_CLASSES]);
  });

  it('maps stored values and treats anything else as not chosen', () => {
    expect(toAvatarClass('bard')).toBe('bard');
    expect(toAvatarClass(null)).toBeNull();
    expect(toAvatarClass(undefined)).toBeNull();
    expect(toAvatarClass('Bard')).toBeNull();
  });
});
