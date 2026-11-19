"use client";
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { taxonomyTermSchema, type TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';
export function TaxonomyManager({ terms, onChanged }: { terms: TaxonomyTerm[]; onChanged: () => void }) {
  const t = useTranslations();
  const [kind, setKind] = useState<'CATEGORY' | 'TAG'>('CATEGORY');
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [rename, setRename] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const online = useOnline();
  const selected = terms.find(term => term.id === selectedId);
  const active = terms.filter(term => term.kind === kind && term.status === 'ACTIVE');
  const duplicate = active.some(term => term.name.normalize('NFKC').trim().toLowerCase() === name.normalize('NFKC').trim().toLowerCase());
  async function mutate(path: string, method: 'POST' | 'PATCH', payload: object) {
    if (busy || !online) return;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/me/taxonomy${path}`, { method, body: JSON.stringify(payload) });
      taxonomyTermSchema.parse(response.data);
      setName(''); setSelectedId(''); setTargetId(''); onChanged();
    } catch { setError(t('taxonomy.changeUnconfirmed')); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent) { event.preventDefault(); if (!duplicate) void mutate('', 'POST', { kind, name: name.trim() }); }
  return <div className="personal-form">
    <p>{t('taxonomy.description')}</p>
    <label className="pixel-field">{t('taxonomy.itemType')}<select className="pixel-field__input" value={kind} onChange={e => { setKind(e.target.value as 'CATEGORY' | 'TAG'); setSelectedId(''); setTargetId(''); }} disabled={busy}>
      <option value="CATEGORY">{t('common.category')}</option><option value="TAG">{t('common.tag')}</option>
    </select></label>
    <form onSubmit={create} className="personal-form">
      <PixelField label={t('taxonomy.newItemName')} required maxLength={60} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
      {duplicate && <p>{t('taxonomy.duplicate')}</p>}
      <PixelButton disabled={busy || !online || duplicate}>{t.rich(kind === 'CATEGORY' ? 'taxonomy.addCategory' : 'taxonomy.addTag', {
        noun: (chunks) => <>{chunks}</>,
      })}</PixelButton>
    </form>
    <label className="pixel-field">{t('taxonomy.manage')}<select className="pixel-field__input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setRename(terms.find(term => term.id === e.target.value)?.name ?? ''); }} disabled={busy}>
      <option value="">{t('taxonomy.chooseItem')}</option>{active.filter(term => term.scope === 'PERSONAL').map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
    </select></label>
    {selected && <div className="personal-form">
      <PixelField label={t('taxonomy.newName')} maxLength={60} value={rename} onChange={e => setRename(e.target.value)} disabled={busy} />
      <PixelButton type="button" disabled={busy || !online || !rename.trim()} onClick={() => void mutate(`/${selected.id}`, 'PATCH', { version: selected.version, name: rename.trim() })}>{t('taxonomy.rename')}</PixelButton>
      <label className="pixel-field">{t('taxonomy.mergeInto')}<select className="pixel-field__input" value={targetId} onChange={e => setTargetId(e.target.value)} disabled={busy}>
        <option value="">{t('taxonomy.chooseTarget')}</option>{active.filter(term => term.id !== selected.id).map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
      </select></label>
      <PixelButton type="button" emphasis="secondary" disabled={busy || !online || !targetId} onClick={() => void mutate(`/${selected.id}/merge`, 'POST', { version: selected.version, target_id: targetId, target_version: terms.find(term => term.id === targetId)!.version })}>{t('taxonomy.confirmMerge')}</PixelButton>
      <p>{t('taxonomy.archiveDescription')}</p>
      <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutate(`/${selected.id}/archive`, 'POST', { version: selected.version })}>{t('taxonomy.confirmArchive')}</PixelButton>
    </div>}
    {error && <><p role="alert">{error}</p><PixelButton type="button" emphasis="secondary" onClick={onChanged}>{t('taxonomy.reload')}</PixelButton></>}
    {!online && <p role="status">{t('taxonomy.offline')}</p>}
  </div>;
}
