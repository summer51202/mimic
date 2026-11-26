-- Phase Avatar. A purely cosmetic class choice plus a cross-device record that the
-- first-time prompt was dismissed. Both columns are nullable; existing users keep NULL.
-- avatar_url stays untouched and unused.
ALTER TABLE "User" ADD COLUMN "avatar_class" VARCHAR(20);
ALTER TABLE "User" ADD COLUMN "avatar_prompt_dismissed_at" TIMESTAMPTZ(6);
ALTER TABLE "User" ADD CONSTRAINT "User_avatar_class_check" CHECK (
  "avatar_class" IS NULL OR "avatar_class" IN (
    'warrior', 'mage', 'ranger', 'rogue', 'alchemist', 'bard', 'cartographer', 'physician'
  )
);
