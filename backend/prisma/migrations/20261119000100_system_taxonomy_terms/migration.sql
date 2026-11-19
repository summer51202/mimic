-- Phase 2I-2S: write the system taxonomy (16 categories + 15 tags) on every database built by
-- `prisma migrate deploy` (Railway staging/production never run prisma/seed.ts).
-- Values are generated from backend/src/modules/taxonomy/system-taxonomy.ts (CATEGORY_CATALOG, TAG_CATALOG)
-- and checked column by column by prisma/migrations/migration-contract.spec.ts.
-- Do not edit this migration after it is deployed: a catalog change needs a new migration.
-- Re-running is safe: conflicting system keys get the same values; identical rows are left untouched.
-- status, merged_into_id and version are never overwritten; no taxonomy audit events are written.
INSERT INTO "taxonomy_terms" ("id", "kind", "scope", "scope_key", "system_key", "name", "normalized_name", "translations", "category_keys", "status", "version", "created_at", "updated_at") VALUES
('20000000-0000-4000-8000-000000000001', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.food', 'Food', 'food', '{"zh-TW":"飲食","en":"Food"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000002', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.household', 'Household supplies', 'household supplies', '{"zh-TW":"日用品","en":"Household supplies"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000003', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.housing', 'Housing', 'housing', '{"zh-TW":"住房","en":"Housing"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000004', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.utilities', 'Utilities and communications', 'utilities and communications', '{"zh-TW":"水電與通訊","en":"Utilities and communications"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000005', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.transportation', 'Transportation', 'transportation', '{"zh-TW":"交通","en":"Transportation"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000006', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.shopping', 'Shopping', 'shopping', '{"zh-TW":"購物","en":"Shopping"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000007', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.entertainment', 'Entertainment', 'entertainment', '{"zh-TW":"娛樂","en":"Entertainment"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000008', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.travel', 'Travel', 'travel', '{"zh-TW":"旅行","en":"Travel"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000009', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.health', 'Health', 'health', '{"zh-TW":"健康","en":"Health"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000010', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.education', 'Education', 'education', '{"zh-TW":"教育","en":"Education"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000011', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.pets', 'Pets', 'pets', '{"zh-TW":"寵物","en":"Pets"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000012', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.family', 'Family and childcare', 'family and childcare', '{"zh-TW":"家庭與育兒","en":"Family and childcare"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000013', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.subscriptions', 'Subscriptions', 'subscriptions', '{"zh-TW":"訂閱","en":"Subscriptions"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000014', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.gifts', 'Gifts', 'gifts', '{"zh-TW":"禮物","en":"Gifts"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000015', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.insurance_taxes', 'Insurance and taxes', 'insurance and taxes', '{"zh-TW":"保險與稅務","en":"Insurance and taxes"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000000016', 'CATEGORY', 'SYSTEM', 'SYSTEM', 'category.uncategorized', 'Uncategorized', 'uncategorized', '{"zh-TW":"未分類","en":"Uncategorized"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001001', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.breakfast', 'Breakfast', 'breakfast', '{"zh-TW":"早餐","en":"Breakfast"}'::JSONB, ARRAY['category.food']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001002', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.lunch', 'Lunch', 'lunch', '{"zh-TW":"午餐","en":"Lunch"}'::JSONB, ARRAY['category.food']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001003', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.dinner', 'Dinner', 'dinner', '{"zh-TW":"晚餐","en":"Dinner"}'::JSONB, ARRAY['category.food']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001004', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.coffee', 'Coffee', 'coffee', '{"zh-TW":"咖啡","en":"Coffee"}'::JSONB, ARRAY['category.food']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001005', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.delivery', 'Delivery', 'delivery', '{"zh-TW":"外送","en":"Delivery"}'::JSONB, ARRAY['category.food']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001006', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.supermarket', 'Supermarket', 'supermarket', '{"zh-TW":"超市","en":"Supermarket"}'::JSONB, ARRAY['category.food', 'category.household']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001007', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.public_transit', 'Public transit', 'public transit', '{"zh-TW":"大眾運輸","en":"Public transit"}'::JSONB, ARRAY['category.transportation']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001008', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.taxi', 'Taxi', 'taxi', '{"zh-TW":"計程車","en":"Taxi"}'::JSONB, ARRAY['category.transportation']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001009', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.parking', 'Parking', 'parking', '{"zh-TW":"停車","en":"Parking"}'::JSONB, ARRAY['category.transportation']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001010', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.fuel', 'Fuel', 'fuel', '{"zh-TW":"加油","en":"Fuel"}'::JSONB, ARRAY['category.transportation']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001011', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.date', 'Date', 'date', '{"zh-TW":"約會","en":"Date"}'::JSONB, ARRAY['category.food', 'category.entertainment']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001012', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.family', 'Family', 'family', '{"zh-TW":"家人","en":"Family"}'::JSONB, ARRAY['category.family']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001013', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.friends', 'Friends', 'friends', '{"zh-TW":"朋友","en":"Friends"}'::JSONB, ARRAY['category.entertainment']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001014', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.travel', 'Travel', 'travel', '{"zh-TW":"旅行","en":"Travel"}'::JSONB, ARRAY['category.travel']::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('20000000-0000-4000-8000-000000001015', 'TAG', 'SYSTEM', 'SYSTEM', 'tag.work_reimbursement', 'Work reimbursement', 'work reimbursement', '{"zh-TW":"工作報銷","en":"Work reimbursement"}'::JSONB, ARRAY[]::TEXT[], 'ACTIVE', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("system_key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "normalized_name" = EXCLUDED."normalized_name",
  "translations" = EXCLUDED."translations",
  "category_keys" = EXCLUDED."category_keys",
  "updated_at" = CURRENT_TIMESTAMP
WHERE ("taxonomy_terms"."name", "taxonomy_terms"."normalized_name", "taxonomy_terms"."translations", "taxonomy_terms"."category_keys")
  IS DISTINCT FROM (EXCLUDED."name", EXCLUDED."normalized_name", EXCLUDED."translations", EXCLUDED."category_keys");
