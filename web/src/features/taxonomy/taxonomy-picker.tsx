"use client";
import { useEffect, useState } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { taxonomyPickerSchema, taxonomyTermSchema, type TaxonomyPickerResult, type TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelField } from '@/shared/ui/pixel-field';
import { PixelButton } from '@/shared/ui/pixel-button';
import { useOnline } from '../personal-expenses/use-online';
export function TaxonomyPicker({ spaceId, categoryId, tagIds, onChange, disabled = false, historicalTerms = [] }: {
  spaceId: string; categoryId: string; tagIds: string[]; disabled?: boolean;
  historicalTerms?: TaxonomyTerm[];
  onChange: (categoryId: string, tagIds: string[]) => void;
}) {
  const [categoryResult, setCategories] = useState<TaxonomyPickerResult>();
  const [tagResult, setTags] = useState<TaxonomyPickerResult>();
  const [search, setSearch] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [creating, setCreating] = useState(false);
  const online = useOnline();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const params = categoryId ? `&category_id=${encodeURIComponent(categoryId)}` : '';
    void Promise.all(['CATEGORY', 'TAG'].map(async kind => {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/taxonomy?kind=${kind}${params}`, { method: 'GET' });
      return taxonomyPickerSchema.parse(response.data);
    })).then(([categories, tags]) => { if (active) { setCategories(categories); setTags(tags); setError(''); } })
      .catch(() => { if (active) setError('類別暫時無法讀取，原有選擇仍保留。'); });
    return () => { active = false; };
  }, [spaceId, categoryId]);
  function label(id: string, name: string, result: TaxonomyPickerResult) {
    const hint = result.recent_ids.includes(id) ? '最近' : result.frequent_ids.includes(id) ? '常用' : result.context_ids.includes(id) ? '建議' : '';
    return hint ? `${name} · ${hint}` : name;
  }
  const visibleTags = tagResult?.terms.filter(term => term.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const visibleCategories = categoryResult?.terms.filter(term => term.name.toLocaleLowerCase().includes(categorySearch.trim().toLocaleLowerCase()));
  async function create(kind: 'CATEGORY' | 'TAG', name: string) {
    if (!online || creating || disabled) return;
    setCreating(true);
    try {
      const response = await appFetch<{ data: unknown }>('/api/app/me/taxonomy', { method: 'POST', body: JSON.stringify({ kind, name: name.trim() }) });
      const term = taxonomyTermSchema.parse(response.data);
      if (kind === 'CATEGORY') {
        setCategories(previous => previous && { ...previous, terms: [...previous.terms, term] });
        setCategorySearch(''); onChange(term.id, tagIds);
      } else {
        setTags(previous => previous && { ...previous, terms: [...previous.terms, term] });
        setSearch(''); onChange(categoryId, [...tagIds, term.id]);
      }
      setError('');
    } catch { setError('新增未確認，請重新搜尋現有項目後再試。'); }
    finally { setCreating(false); }
  }
  return <fieldset disabled={disabled} className="personal-taxonomy">
    <legend>類別與標籤</legend>
    <PixelField label="搜尋類別" maxLength={60} value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
    <label className="pixel-field">類別<select className="pixel-field__input" value={categoryId} onChange={e => onChange(e.target.value, tagIds)}>
      <option value="">未分類</option>
      {categoryId && !categoryResult?.terms.some(term => term.id === categoryId) && <option value={categoryId}>{historicalTerms.find(term => term.id === categoryId)?.name ?? '原有類別'}（保留歷史紀錄）</option>}
      {categoryResult?.terms.filter(term => term.id === categoryId || visibleCategories?.some(item => item.id === term.id)).map(term => <option key={term.id} value={term.id}>{label(term.id, term.name, categoryResult)}</option>)}
    </select></label>
    {categorySearch.trim() && visibleCategories?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating} onClick={() => void create('CATEGORY', categorySearch)}>新增類別「{categorySearch.trim()}」</PixelButton>}
    <PixelField label="搜尋標籤" maxLength={60} value={search} onChange={e => setSearch(e.target.value)} />
    <div className="personal-tags">
      {visibleTags?.map(term => <label key={term.id}><input type="checkbox" checked={tagIds.includes(term.id)} disabled={!tagIds.includes(term.id) && tagIds.length >= 20}
        onChange={e => onChange(categoryId, e.target.checked ? [...tagIds, term.id] : tagIds.filter(id => id !== term.id))} />{label(term.id, term.name, tagResult!)}</label>)}
      {tagIds.filter(id => !tagResult?.terms.some(term => term.id === id)).map((id, index) => <label key={id}><input type="checkbox" checked onChange={() => onChange(categoryId, tagIds.filter(tag => tag !== id))} />{historicalTerms.find(term => term.id === id)?.name ?? `原有標籤 ${index + 1}`}（歷史）</label>)}
    </div>
    {search.trim() && visibleTags?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating || tagIds.length >= 20} onClick={() => void create('TAG', search)}>新增標籤「{search.trim()}」</PixelButton>}
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
