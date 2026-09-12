'use client';
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema, type FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

export function PooledSpaceForm({ groupId, defaultCurrency = 'TWD', onCreated }: {
  groupId: string; defaultCurrency?: string; onCreated: (space: FinancialSpace) => void;
}) {
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const online = useOnline();
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy) return;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/groups/${groupId}/spaces`, { method: 'POST', body: JSON.stringify({
        name: name.trim(), mode: 'POOLED_FUND', currency, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }) });
      onCreated(financialSpaceSchema.parse(response.data));
    } catch { setError('尚未確認共同基金是否建立。請重新讀取群組後再決定是否重試。'); }
    finally { setBusy(false); }
  }
  return <form className="pooled-form" onSubmit={submit}>
    <p>這個寶箱只計算實際投入、基金支出、代墊與退回；預期投入不會算進餘額。</p>
    <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
    <label className="pixel-field">幣別<select aria-label="幣別" className="pixel-field__input" value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={busy}>
      {['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY', 'KRW', 'KWD'].map((code) => <option key={code}>{code}</option>)}
    </select></label>
    {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
    {error && <p role="alert">{error}</p>}
    <PixelButton disabled={!online || busy || !name.trim()}>{busy ? '建立中…' : '建立共同基金'}</PixelButton>
  </form>;
}
