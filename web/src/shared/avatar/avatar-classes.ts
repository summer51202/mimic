import { z } from "zod";

import { sceneAssetRoot } from "@/shared/scene/geometry";

// Phase Avatar. Purely cosmetic: a class only changes how a member looks.
export const avatarClasses = [
  "warrior",
  "mage",
  "ranger",
  "rogue",
  "alchemist",
  "bard",
  "cartographer",
  "physician",
] as const;

export type AvatarClass = (typeof avatarClasses)[number];

export function isAvatarClass(value: unknown): value is AvatarClass {
  return avatarClasses.some((avatarClass) => avatarClass === value);
}

/**
 * Contract field for `avatar_class`. Optional until the API that sends it is deployed
 * everywhere (spec §3.3): a missing field stays `undefined` ("this API does not know
 * classes"), while `null` or a value this build does not know means "not chosen".
 */
export const avatarClassFieldSchema = z
  .string()
  .nullable()
  .transform((value): AvatarClass | null => (isAvatarClass(value) ? value : null))
  .optional();

export const avatarPortraitSrc = (avatarClass: AvatarClass) =>
  `${sceneAssetRoot}/avatars/${avatarClass}-portrait.png`;

export const avatarFullSrc = (avatarClass: AvatarClass) =>
  `${sceneAssetRoot}/avatars/${avatarClass}-full.png`;

/** Each 192×192 full-body master's opaque bounds; the Home slot box holds exactly this area. */
export const avatarFullSize = 192;
export const avatarFullBounds: Record<AvatarClass, { x: number; y: number; width: number; height: number }> = {
  warrior: { x: 35, y: 15, width: 122, height: 168 },
  mage: { x: 42, y: 15, width: 108, height: 168 },
  ranger: { x: 28, y: 15, width: 135, height: 168 },
  rogue: { x: 38, y: 15, width: 116, height: 168 },
  alchemist: { x: 51, y: 15, width: 89, height: 168 },
  bard: { x: 36, y: 15, width: 120, height: 168 },
  cartographer: { x: 45, y: 15, width: 102, height: 168 },
  physician: { x: 34, y: 15, width: 124, height: 168 },
};
