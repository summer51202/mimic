'use client';
import { useTranslations } from 'next-intl';
import { useState, type FormEvent } from 'react';
import { appFetch } from '@/shared/api/app-fetch';
import { financialSpaceSchema, type FinancialSpace } from '@/shared/api/financial-space-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

export function PooledSpaceForm({ groupId, defaultCurrency = 'TWD', onCreated }: {
  groupId: string; defaultCurrency?: string; onCreated: (space: FinancialSpace) => void;
}) {
  const t = useTranslations('pooled');
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
    } catch { setError(t('createUnconfirmed')); }
    finally { setBusy(false); }
  }
  return <form className="pooled-form" onSubmit={submit}>
    <p>{t('createIntro')}</p>
    <PixelField label={t('chestName')} required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} disabled={busy} />
    <label className="pixel-field">{t('currency')}<select aria-label={t('currency')} className="pixel-field__input" value={currency} onChange={(event) => setCurrency(event.target.value)} disabled={busy}>
      {['TWD', 'USD', 'JPY', 'EUR', 'HKD', 'CNY', 'KRW', 'KWD'].map((code) => <option key={code}>{code}</option>)}
    </select></label>
    {!online && <p role="status">{t('createOffline')}</p>}
    {error && <p role="alert">{error}</p>}
    <PixelButton disabled={!online || busy || !name.trim()}>{busy ? t('creating') : t('createFund')}</PixelButton>
  </form>;
}
