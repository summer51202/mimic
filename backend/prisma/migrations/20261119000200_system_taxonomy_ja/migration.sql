-- Only translations change; preserve name, lifecycle and optimistic concurrency version.
UPDATE "taxonomy_terms" AS term
SET "translations" = source.translations, "updated_at" = CURRENT_TIMESTAMP
FROM (VALUES
  ('category.food', '{"zh-TW":"飲食","en":"Food","ja":"食費"}'::JSONB),
  ('category.household', '{"zh-TW":"日用品","en":"Household supplies","ja":"日用品"}'::JSONB),
  ('category.housing', '{"zh-TW":"住房","en":"Housing","ja":"住居費"}'::JSONB),
  ('category.utilities', '{"zh-TW":"水電與通訊","en":"Utilities and communications","ja":"水道光熱費・通信費"}'::JSONB),
  ('category.transportation', '{"zh-TW":"交通","en":"Transportation","ja":"交通費"}'::JSONB),
  ('category.shopping', '{"zh-TW":"購物","en":"Shopping","ja":"ショッピング"}'::JSONB),
  ('category.entertainment', '{"zh-TW":"娛樂","en":"Entertainment","ja":"娯楽"}'::JSONB),
  ('category.travel', '{"zh-TW":"旅行","en":"Travel","ja":"旅行"}'::JSONB),
  ('category.health', '{"zh-TW":"健康","en":"Health","ja":"健康・医療"}'::JSONB),
  ('category.education', '{"zh-TW":"教育","en":"Education","ja":"教育"}'::JSONB),
  ('category.pets', '{"zh-TW":"寵物","en":"Pets","ja":"ペット"}'::JSONB),
  ('category.family', '{"zh-TW":"家庭與育兒","en":"Family and childcare","ja":"家族・育児"}'::JSONB),
  ('category.subscriptions', '{"zh-TW":"訂閱","en":"Subscriptions","ja":"サブスク"}'::JSONB),
  ('category.gifts', '{"zh-TW":"禮物","en":"Gifts","ja":"プレゼント"}'::JSONB),
  ('category.insurance_taxes', '{"zh-TW":"保險與稅務","en":"Insurance and taxes","ja":"保険・税金"}'::JSONB),
  ('category.uncategorized', '{"zh-TW":"未分類","en":"Uncategorized","ja":"未分類"}'::JSONB),
  ('tag.breakfast', '{"zh-TW":"早餐","en":"Breakfast","ja":"朝食"}'::JSONB),
  ('tag.lunch', '{"zh-TW":"午餐","en":"Lunch","ja":"昼食"}'::JSONB),
  ('tag.dinner', '{"zh-TW":"晚餐","en":"Dinner","ja":"夕食"}'::JSONB),
  ('tag.coffee', '{"zh-TW":"咖啡","en":"Coffee","ja":"コーヒー"}'::JSONB),
  ('tag.delivery', '{"zh-TW":"外送","en":"Delivery","ja":"デリバリー"}'::JSONB),
  ('tag.supermarket', '{"zh-TW":"超市","en":"Supermarket","ja":"スーパー"}'::JSONB),
  ('tag.public_transit', '{"zh-TW":"大眾運輸","en":"Public transit","ja":"公共交通機関"}'::JSONB),
  ('tag.taxi', '{"zh-TW":"計程車","en":"Taxi","ja":"タクシー"}'::JSONB),
  ('tag.parking', '{"zh-TW":"停車","en":"Parking","ja":"駐車料金"}'::JSONB),
  ('tag.fuel', '{"zh-TW":"加油","en":"Fuel","ja":"ガソリン"}'::JSONB),
  ('tag.date', '{"zh-TW":"約會","en":"Date","ja":"デート"}'::JSONB),
  ('tag.family', '{"zh-TW":"家人","en":"Family","ja":"家族"}'::JSONB),
  ('tag.friends', '{"zh-TW":"朋友","en":"Friends","ja":"友だち"}'::JSONB),
  ('tag.travel', '{"zh-TW":"旅行","en":"Travel","ja":"旅行"}'::JSONB),
  ('tag.work_reimbursement', '{"zh-TW":"工作報銷","en":"Work reimbursement","ja":"経費精算"}'::JSONB)
) AS source(system_key, translations)
WHERE term."system_key" = source.system_key
  AND term."translations" IS DISTINCT FROM source.translations;
