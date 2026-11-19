"use client";
import { useTranslations } from "next-intl";
import { useRef, useState, type FormEvent } from 'react';
import { appFetch, AppClientError } from '@/shared/api/app-fetch';
import {
  personalReferenceMutationSchema,
  type PersonalReferenceEntry,
  type PersonalReferenceMutation,
} from '@/shared/api/personal-expense-contracts';
import type { TaxonomyTerm } from '@/shared/api/taxonomy-contracts';
import { PixelButton } from '@/shared/ui/pixel-button';
import { PixelField } from '@/shared/ui/pixel-field';
import { useOnline } from './use-online';

export function PersonalReferenceForm({ spaceId, reference, terms, onSaved, onReload }: {
  spaceId: string;
  reference: PersonalReferenceEntry;
  terms: TaxonomyTerm[];
  onSaved: (result: PersonalReferenceMutation) => void;
  onReload?: () => Promise<PersonalReferenceEntry | undefined>;
}) {
  const t = useTranslations('personal.reference');
  const common = useTranslations('common');
  const [note, setNote] = useState(reference.note ?? '');
  const [tags, setTags] = useState(reference.tag_ids);
  const [version, setVersion] = useState(reference.version);
  const [latest, setLatest] = useState<PersonalReferenceEntry>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const attempt = useRef({ fingerprint: '', id: '' });
  const online = useOnline();
  const availableTags = terms.filter(term => term.kind === 'TAG' && term.status === 'ACTIVE' && term.canonical_id === term.id);

  function toggle(tagId: string) {
    setTags(current => current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId]);
    setConflict(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!online || busy || conflict) return;
    const payload = { version, note: note.trim() || null, tag_ids: [...tags].sort() };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current.fingerprint !== fingerprint) attempt.current = { fingerprint, id: crypto.randomUUID() };
    setBusy(true); setError('');
    try {
      const response = await appFetch<{ data: unknown }>(`/api/app/spaces/${spaceId}/personal-references/${reference.id}`, {
        method: 'PATCH', body: JSON.stringify({ ...payload, request_id: attempt.current.id }),
      });
      onSaved(personalReferenceMutationSchema.parse(response.data));
    } catch (failure) {
      if (failure instanceof AppClientError && failure.status === 409) {
        setConflict(true);
        setError(t('conflict'));
      } else {
        setError(t('unconfirmed'));
      }
    } finally { setBusy(false); }
  }

  async function reload() {
    if (!onReload || busy) return;
    setBusy(true);
    try {
      const refreshed = await onReload();
      if (!refreshed) {
        setError(t('missing'));
        return;
      }
      setLatest(refreshed); setVersion(refreshed.version); setConflict(false); setError('');
    } catch { setError(t('reloadFailed')); }
    finally { setBusy(false); }
  }

  return <form className="personal-reference-form" onSubmit={submit}>
    <p className="personal-reference-ticket">{t('sharedReadOnly')}</p>
    {reference.source_locked && <p className="personal-reference-lock">{t('locked')}</p>}
    {availableTags.length > 0 && <fieldset className="personal-reference-tags"><legend>{t('tags')}</legend>
      {availableTags.map(tag => <label key={tag.id}><input type="checkbox" checked={tags.includes(tag.id)} onChange={() => toggle(tag.id)} disabled={busy} />{tag.name}</label>)}
    </fieldset>}
    <PixelField label={t('note')} value={note} onChange={event => { setNote(event.target.value); setConflict(false); }} maxLength={2000} disabled={busy}
      description={t('privacy')} />
    {!online && <p role="status">{t('offline')}</p>}
    {error && <p role="alert">{error}</p>}
    {latest && <p role="status">{latest.note
      ? t.rich('latestWithNote', { note: latest.note, privateNote: (chunks) => <>{chunks}</> })
      : t.rich('latestWithoutNote', { privateNote: (chunks) => <>{chunks}</> })}</p>}
    {conflict && onReload && <PixelButton type="button" emphasis="secondary" onClick={() => void reload()} disabled={busy || !online}>{common('loadLatest')}</PixelButton>}
    <PixelButton type="submit" disabled={busy || !online || conflict}>{busy ? common('confirming') : t('save')}</PixelButton>
  </form>;
}
