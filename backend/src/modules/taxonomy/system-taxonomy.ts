export interface SystemTerm {
  id: string; kind: 'CATEGORY' | 'TAG'; scope: 'SYSTEM'; scopeKey: string;
  systemKey: string; name: string; normalizedName: string;
  translations: Record<string, string>; categoryKeys: string[];
}

export const UNCATEGORIZED_ID = '20000000-0000-4000-8000-000000000016';
const categories = [
  ['food', '飲食', 'Food'], ['household', '日用品', 'Household supplies'],
  ['housing', '住房', 'Housing'], ['utilities', '水電與通訊', 'Utilities and communications'],
  ['transportation', '交通', 'Transportation'], ['shopping', '購物', 'Shopping'],
  ['entertainment', '娛樂', 'Entertainment'], ['travel', '旅行', 'Travel'],
  ['health', '健康', 'Health'], ['education', '教育', 'Education'], ['pets', '寵物', 'Pets'],
  ['family', '家庭與育兒', 'Family and childcare'], ['subscriptions', '訂閱', 'Subscriptions'],
  ['gifts', '禮物', 'Gifts'], ['insurance_taxes', '保險與稅務', 'Insurance and taxes'],
  ['uncategorized', '未分類', 'Uncategorized'],
] as const;
const tags: ReadonlyArray<readonly [string, string, readonly string[]]> = [
  ['breakfast', '早餐', ['food']], ['lunch', '午餐', ['food']], ['dinner', '晚餐', ['food']],
  ['coffee', '咖啡', ['food']], ['delivery', '外送', ['food']], ['supermarket', '超市', ['food', 'household']],
  ['public_transit', '大眾運輸', ['transportation']], ['taxi', '計程車', ['transportation']],
  ['parking', '停車', ['transportation']], ['fuel', '加油', ['transportation']],
  ['date', '約會', ['food', 'entertainment']], ['family', '家人', ['family']],
  ['friends', '朋友', ['entertainment']], ['travel', '旅行', ['travel']], ['work_reimbursement', '工作報銷', []],
];
export const CATEGORY_CATALOG: SystemTerm[] = categories.map(([key, zh, en], i) => ({
  id: `20000000-0000-4000-8000-0000000000${String(i + 1).padStart(2, '0')}`,
  kind: 'CATEGORY', scope: 'SYSTEM', scopeKey: 'SYSTEM', systemKey: `category.${key}`,
  name: en, normalizedName: en.toLowerCase(), translations: { 'zh-TW': zh, en }, categoryKeys: [],
}));
export const TAG_CATALOG: SystemTerm[] = tags.map(([key, zh, contexts], i) => {
  const en = key[0].toUpperCase() + key.slice(1).replaceAll('_', ' ');
  return {
    id: `20000000-0000-4000-8000-0000000010${String(i + 1).padStart(2, '0')}`,
    kind: 'TAG', scope: 'SYSTEM', scopeKey: 'SYSTEM', systemKey: `tag.${key}`,
    name: en, normalizedName: en.toLowerCase(), translations: { 'zh-TW': zh, en },
    categoryKeys: contexts.map(context => `category.${context}`),
  };
});
