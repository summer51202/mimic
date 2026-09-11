"use client";
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { taxonomyTermSchema, type TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';
export function TaxonomyManager({ terms, onChanged }: { terms: TaxonomyTerm[]; onChanged: () => void }) {
  const [kind, setKind] = useState<'CATEGORY' | 'TAG'>('CATEGORY');
  const [name, setName] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [rename, setRename] = useState('');
  const [targetId, setTargetId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const online = useOnline();
  const selected = terms.find(term => term.id === selectedId);
  const noun = kind === 'CATEGORY' ? '類別' : '標籤';
  const active = terms.filter(term => term.kind === kind && term.status === 'ACTIVE');
  const duplicate = active.some(term => term.name.normalize('NFKC').trim().toLowerCase() === name.normalize('NFKC').trim().toLowerCase());
  async function mutate(path: string, method: 'POST' | 'PATCH', payload: object) {
    if (busy || !online) return;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/me/taxonomy${path}`, { method, body: JSON.stringify(payload) });
      taxonomyTermSchema.parse(response.data);
      setName(''); setSelectedId(''); setTargetId(''); onChanged();
    } catch { setError('變更未確認。請重新讀取最新類別與標籤，再檢查名稱或版本。'); }
    finally { setBusy(false); }
  }
  function create(event: FormEvent) { event.preventDefault(); if (!duplicate) void mutate('', 'POST', { kind, name: name.trim() }); }
  return <div className="personal-form">
    <p>預設項目供所有模式使用；自訂項目只屬於你。合併保留原始支出紀錄，分析會歸入目標項目。</p>
    <label className="pixel-field">項目種類<select className="pixel-field__input" value={kind} onChange={e => { setKind(e.target.value as 'CATEGORY' | 'TAG'); setSelectedId(''); setTargetId(''); }} disabled={busy}>
      <option value="CATEGORY">類別</option><option value="TAG">標籤</option>
    </select></label>
    <form onSubmit={create} className="personal-form">
      <PixelField label="新增名稱" required maxLength={60} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
      {duplicate && <p>已有相同名稱，請使用現有項目。</p>}
      <PixelButton disabled={busy || !online || duplicate}>新增{noun}</PixelButton>
    </form>
    <label className="pixel-field">管理自訂項目<select className="pixel-field__input" value={selectedId} onChange={e => { setSelectedId(e.target.value); setRename(terms.find(term => term.id === e.target.value)?.name ?? ''); }} disabled={busy}>
      <option value="">選擇項目</option>{active.filter(term => term.scope === 'PERSONAL').map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
    </select></label>
    {selected && <div className="personal-form">
      <PixelField label="新名稱" maxLength={60} value={rename} onChange={e => setRename(e.target.value)} disabled={busy} />
      <PixelButton type="button" disabled={busy || !online || !rename.trim()} onClick={() => void mutate(`/${selected.id}`, 'PATCH', { version: selected.version, name: rename.trim() })}>重新命名</PixelButton>
      <label className="pixel-field">合併至<select className="pixel-field__input" value={targetId} onChange={e => setTargetId(e.target.value)} disabled={busy}>
        <option value="">選擇目標</option>{active.filter(term => term.id !== selected.id).map(term => <option key={term.id} value={term.id}>{term.name}</option>)}
      </select></label>
      <PixelButton type="button" emphasis="secondary" disabled={busy || !online || !targetId} onClick={() => void mutate(`/${selected.id}/merge`, 'POST', { version: selected.version, target_id: targetId, target_version: terms.find(term => term.id === targetId)!.version })}>確認合併</PixelButton>
      <p>封存後不能用於新支出，舊支出仍保留此項目。</p>
      <PixelButton type="button" emphasis="danger" disabled={busy || !online} onClick={() => void mutate(`/${selected.id}/archive`, 'POST', { version: selected.version })}>確認封存</PixelButton>
    </div>}
    {error && <><p role="alert">{error}</p><PixelButton type="button" emphasis="secondary" onClick={onChanged}>重新讀取類別與標籤</PixelButton></>}
    {!online && <p role="status">目前離線，尚未儲存變更。</p>}
  </div>;
}
