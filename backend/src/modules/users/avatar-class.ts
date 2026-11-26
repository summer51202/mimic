// Phase Avatar. Purely cosmetic; must match the CHECK constraint in
// prisma/migrations/20261125000100_user_avatar_class.
export const AVATAR_CLASSES = [
  'warrior',
  'mage',
  'ranger',
  'rogue',
  'alchemist',
  'bard',
  'cartographer',
  'physician',
] as const;

export type AvatarClass = (typeof AVATAR_CLASSES)[number];

export function toAvatarClass(value: string | null | undefined): AvatarClass | null {
  return AVATAR_CLASSES.find((avatarClass) => avatarClass === value) ?? null;
}
