"use client";
import { useTranslations } from 'next-intl';
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import { personalReferenceMutationSchema, type PersonalReferenceMutation } from '@/shared/api/personal-expense-contracts';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from '../personal-expenses/use-online';

interface PersonalDestination { id: string; name: string; currency: string }

export function PersonalReferenceForm({ sourceExpenseId, sourceLocked, personalSpaces, personalTags, onSaved, onReload }: {
  sourceExpenseId: string; sourceLocked: boolean; personalSpaces: PersonalDestination[]; personalTags: TaxonomyTerm[];
  onSaved: (result: PersonalReferenceMutation, personalSpaceId: string) => void;
  onReload?: () => Promise<unknown>;
}) {
  const t = useTranslations();
  const [spaceId, setSpaceId] = useState(personalSpaces[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const attempt = useRef({ fingerprint: '', id: '' });
  const online = useOnline();
  const availableTags = personalTags.filter(tag => tag.kind === 'TAG' && tag.status === 'ACTIVE' && tag.canonical_id === tag.id);

  function toggle(tagId: string) {
    setTags(current => current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId]);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!spaceId || !online || busy || conflict) return;
    const payload = { request_id: '', source_expense_id: sourceExpenseId,
      tag_ids: [...tags].sort(), note: note.trim() || null };
    const fingerprint = JSON.stringify({ ...payload, request_id: undefined, personal_space_id: spaceId });
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    payload.request_id = attempt.current.id;
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-references`, {
        method: 'POST', body: JSON.stringify(payload),
      });
      onSaved(personalReferenceMutationSchema.parse(response.data), spaceId);
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true); setError(t('shared.reference.conflict'));
      } else setError(t('shared.reference.unconfirmed'));
    } finally { setBusy(false); }
  }

  async function reload() {
    if (!onReload) return;
    setBusy(true);
    try { await onReload(); setConflict(false); setError(''); }
    catch { setError(t('shared.reference.reloadFailed')); }
    finally { setBusy(false); }
  }

  if (!personalSpaces.length) return <div className="personal-reference-empty">
    <p>{t('shared.reference.noMatchingChest')}</p>
    <a className="pixel-link" href="/app/personal">{t('shared.reference.createPersonal')}</a>
  </div>;

  return <form className="personal-reference-form" onSubmit={submit}>
    <p className="personal-reference-ticket">{t('shared.reference.linkOnly')}</p>
    {sourceLocked && <p className="personal-reference-lock">{t('shared.reference.locked')}</p>}
    <label className="pixel-field"><span className="pixel-field__label">{t('shared.reference.destination')}</span>
      <select className="pixel-field__input" aria-label={t('shared.reference.destination')} value={spaceId} onChange={event => { setSpaceId(event.target.value); setConflict(false); }} disabled={busy}>
        {personalSpaces.map(space => <option value={space.id} key={space.id}>{t.rich('common.nameCurrency', {
          name: () => <>{space.name}</>, currency: () => <>{space.currency}</>,
        })}</option>)}
      </select></label>
    {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>{t('common.privateTags')}</legend>
      {availableTags.map(tag => <label key={tag.id}><input type="checkbox" checked={tags.includes(tag.id)}
        onChange={() => toggle(tag.id)} disabled={busy} />{tag.name}</label>)}
    </fieldset>}
    <PixelField label={t('common.privateNote')} value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000}
      description={t('shared.reference.privateDescription')} disabled={busy} />
    {!online && <p role="status">{t('shared.reference.offline')}</p>}
    {error && <p role="alert">{error}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{t('shared.reference.reload')}</PixelButton>}
    <PixelButton disabled={busy || !online || conflict}>{busy ? t('common.confirming') : t('common.addToLedger')}</PixelButton>
  </form>;
}
