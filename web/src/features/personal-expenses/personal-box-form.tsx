"use client";
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema, type FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from './use-online';
export function PersonalBoxForm({ onCreated }: { onCreated: (space: FinancialSpace) => void }) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('TWD');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const online = useOnline();
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!online || busy) return;
    setBusy(true); setError('');
    try {
      const result = await appFetch<{ data: unknown }>('/api/app/me/spaces', { method: 'POST', body: JSON.stringify({
        name: name.trim(), mode: 'PERSONAL_EXPENSES', currency,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }) });
      onCreated(financialSpaceSchema.parse(result.data));
    } catch { setError('無法確認寶箱是否建立，請重新整理清單後再試。'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="personal-form">
    <p>只有你能讀取此寶箱的支出。第一筆記帳後，幣別與時區即固定。</p>
    <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={e => setName(e.target.value)} disabled={busy} />
    <label className="pixel-field">幣別<select value={currency} onChange={e => setCurrency(e.target.value)} disabled={busy} className="pixel-field__input">
      {['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY', 'KRW', 'KWD'].map(code => <option key={code}>{code}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}
    {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
    <PixelButton disabled={busy || !online}>{busy ? '建立中…' : '建立個人寶箱'}</PixelButton>
  </form>;
}
