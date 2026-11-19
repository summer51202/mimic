"use client";
import { useTranslations } from 'next-intl';
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
  const t = useTranslations();
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
      .catch(() => { if (active) setError(t('taxonomy.readFailed')); });
    return () => { active = false; };
  }, [spaceId, categoryId, t]);
  function label(id: string, name: string, result: TaxonomyPickerResult) {
    const hint = result.recent_ids.includes(id) ? t('taxonomy.recent') : result.frequent_ids.includes(id) ? t('taxonomy.frequent') : result.context_ids.includes(id) ? t('taxonomy.suggested') : '';
    return hint ? t('taxonomy.itemHint', { name, hint }) : name;
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
    } catch { setError(t('taxonomy.createFailed')); }
    finally { setCreating(false); }
  }
  return <fieldset disabled={disabled} className="personal-taxonomy">
    <legend>{t('taxonomy.title')}</legend>
    <PixelField label={t('taxonomy.searchCategories')} maxLength={60} value={categorySearch} onChange={e => setCategorySearch(e.target.value)} />
    <label className="pixel-field">{t('common.category')}<select className="pixel-field__input" value={categoryId} onChange={e => onChange(e.target.value, tagIds)}>
      <option value="">{t('taxonomy.uncategorized')}</option>
      {categoryId && !categoryResult?.terms.some(term => term.id === categoryId) && <option value={categoryId}>{t.rich('taxonomy.historicalCategory', {
        name: () => <>{historicalTerms.find(term => term.id === categoryId)?.name ?? t('taxonomy.originalCategory')}</>,
      })}</option>}
      {categoryResult?.terms.filter(term => term.id === categoryId || visibleCategories?.some(item => item.id === term.id)).map(term => <option key={term.id} value={term.id}>{label(term.id, term.name, categoryResult)}</option>)}
    </select></label>
    {categorySearch.trim() && visibleCategories?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating} onClick={() => void create('CATEGORY', categorySearch)}>{t.rich('taxonomy.createNamedCategory', {
      name: () => <>{categorySearch.trim()}</>,
    })}</PixelButton>}
    <PixelField label={t('taxonomy.searchTags')} maxLength={60} value={search} onChange={e => setSearch(e.target.value)} />
    <div className="personal-tags">
      {visibleTags?.map(term => <label key={term.id}><input type="checkbox" checked={tagIds.includes(term.id)} disabled={!tagIds.includes(term.id) && tagIds.length >= 20}
        onChange={e => onChange(categoryId, e.target.checked ? [...tagIds, term.id] : tagIds.filter(id => id !== term.id))} />{label(term.id, term.name, tagResult!)}</label>)}
      {tagIds.filter(id => !tagResult?.terms.some(term => term.id === id)).map((id, index) => <label key={id}><input type="checkbox" checked onChange={() => onChange(categoryId, tagIds.filter(tag => tag !== id))} />{t.rich('taxonomy.historicalTag', {
        name: () => <>{historicalTerms.find(term => term.id === id)?.name ?? t('taxonomy.originalTag', { number: index + 1 })}</>,
      })}</label>)}
    </div>
    {search.trim() && visibleTags?.length === 0 && <PixelButton type="button" emphasis="secondary" disabled={!online || creating || tagIds.length >= 20} onClick={() => void create('TAG', search)}>{t.rich('taxonomy.createNamedTag', {
      name: () => <>{search.trim()}</>,
    })}</PixelButton>}
    {error && <p role="alert">{error}</p>}
  </fieldset>;
}
