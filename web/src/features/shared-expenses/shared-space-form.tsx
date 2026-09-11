"use client";
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema, type FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

export function SharedSpaceForm({ groupId, defaultCurrency, onCreated }: {
  groupId: string; defaultCurrency: string; onCreated: (space: FinancialSpace) => void;
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
      const response = await appFetch<{ data: unknown }>(`/api/app/groups/${groupId}/spaces`, {
        method: 'POST', body: JSON.stringify({ name: name.trim(), mode: 'SHARED_EXPENSES', currency,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
      });
      onCreated(financialSpaceSchema.parse(response.data));
    } catch {
      setError('尚未確認寶箱是否建立。請先關閉並重新整理群組清單，再決定是否重試。');
    } finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="shared-form">
    <p>只有寶箱參與者能讀取分帳金額與紀錄。建立者會成為第一位管理者。</p>
    <PixelField label="寶箱名稱" required maxLength={100} value={name} onChange={event => setName(event.target.value)} disabled={busy} />
    <label className="pixel-field">幣別<select aria-label="幣別" className="pixel-field__input" value={currency} onChange={event => setCurrency(event.target.value)} disabled={busy}>
      {['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY', 'KRW', 'KWD'].map(code => <option key={code}>{code}</option>)}
    </select></label>
    {!online && <p role="status">目前離線，尚未建立寶箱。</p>}
    {error && <p role="alert">{error}</p>}
    <PixelButton disabled={!online || busy}>{busy ? '建立中…' : '建立共同分帳'}</PixelButton>
  </form>;
}
