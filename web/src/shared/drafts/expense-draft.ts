import { z } from 'zod';

const uuid = z.string().uuid();
const safeVersion = z.number().int().positive().safe();
const text = z.string();
const date = z.iso.date();
const idList = z.array(uuid).max(20);
const valueMap = z.record(uuid, text);

const personalPayloadSchema = z.object({
  title: text,
  amount: text,
  occurred_on: date,
  note: text,
  category_id: z.union([z.literal(''), uuid]),
  tag_ids: idList,
}).strict();

const sharedPayloadSchema = personalPayloadSchema.extend({
  payer_ids: idList,
  payer_values: valueMap,
  allocation_mode: z.enum(['EQUAL', 'FIXED']),
  allocation_ids: idList,
  allocation_values: valueMap,
}).strict();

const pooledPayloadSchema = z.object({
  title: text,
  amount: text,
  occurred_on: date,
  payment_source: z.enum(['FUND_PAID', 'PARTICIPANT_ADVANCED']),
  advanced_by_user_id: z.union([z.literal(''), uuid]),
}).strict().superRefine((value, issue) => {
  if (value.payment_source === 'PARTICIPANT_ADVANCED' && value.advanced_by_user_id === '') {
    issue.addIssue({ code: 'custom', message: 'POOLED_ADVANCER_REQUIRED' });
  }
  if (value.payment_source === 'FUND_PAID' && value.advanced_by_user_id !== '') {
    issue.addIssue({ code: 'custom', message: 'POOLED_ADVANCER_FORBIDDEN' });
  }
});

const payloadSchemas = {
  PERSONAL_EXPENSES: personalPayloadSchema,
  SHARED_EXPENSES: sharedPayloadSchema,
  POOLED_FUND: pooledPayloadSchema,
} as const;

const storedDraftSchema = z.object({
  schema_version: z.literal(1),
  status: z.literal('NOT_SUBMITTED'),
  actor_user_id: uuid,
  group_id: uuid.nullable(),
  space_id: uuid,
  mode: z.enum(['PERSONAL_EXPENSES', 'SHARED_EXPENSES', 'POOLED_FUND']),
  operation: z.enum(['CREATE', 'UPDATE']),
  resource_id: uuid.nullable(),
  space_version: safeVersion,
  record_version: safeVersion.nullable(),
  saved_at: z.iso.datetime({ offset: true }),
  request_id: uuid,
  fingerprint: z.string().min(1),
  payload: z.unknown(),
}).strict().superRefine((draft, issue) => {
  const isPersonal = draft.mode === 'PERSONAL_EXPENSES';
  if ((isPersonal && draft.group_id !== null) || (!isPersonal && draft.group_id === null)) {
    issue.addIssue({ code: 'custom', message: 'DRAFT_SCOPE_INVALID' });
  }
  const isCreate = draft.operation === 'CREATE';
  if ((isCreate && (draft.resource_id !== null || draft.record_version !== null))
    || (!isCreate && (draft.resource_id === null || draft.record_version === null))) {
    issue.addIssue({ code: 'custom', message: 'DRAFT_OPERATION_INVALID' });
  }
  if (!payloadSchemas[draft.mode].safeParse(draft.payload).success) {
    issue.addIssue({ code: 'custom', message: 'DRAFT_PAYLOAD_INVALID' });
  }
});

export type PersonalExpenseDraftPayload = z.infer<typeof personalPayloadSchema>;
export type SharedExpenseDraftPayload = z.infer<typeof sharedPayloadSchema>;
export type PooledExpenseDraftPayload = z.infer<typeof pooledPayloadSchema>;
export type ExpenseDraftPayload =
  | PersonalExpenseDraftPayload
  | SharedExpenseDraftPayload
  | PooledExpenseDraftPayload;

export type DraftContext = {
  actorUserId: string;
  groupId: string | null;
  spaceId: string;
  mode: 'PERSONAL_EXPENSES' | 'SHARED_EXPENSES' | 'POOLED_FUND';
  operation: 'CREATE' | 'UPDATE';
  resourceId: string | null;
  spaceVersion: number;
  recordVersion: number | null;
  writable: boolean;
};

export type StoredExpenseDraft = Omit<z.infer<typeof storedDraftSchema>, 'payload'> & {
  payload: ExpenseDraftPayload;
};

export type DraftLoadResult =
  | { state: 'MISSING' | 'CORRUPT' | 'BLOCKED' }
  | { state: 'READY' | 'STALE'; draft: StoredExpenseDraft };

const prefix = 'mimic:expense-draft:v1';

function scopeKey(context: DraftContext) {
  return `${prefix}:index:${context.actorUserId}:${context.groupId ?? 'personal'}:${context.spaceId}:${context.mode}`;
}

function storageKey(context: DraftContext) {
  return `${prefix}:${context.actorUserId}:${context.groupId ?? 'personal'}:${context.spaceId}:${context.mode}:${context.operation}:${context.resourceId ?? 'new'}`;
}

function parseStored(value: string | null): StoredExpenseDraft | null {
  if (value === null) return null;
  try {
    const parsed = storedDraftSchema.parse(JSON.parse(value));
    const payload = payloadSchemas[parsed.mode].parse(parsed.payload);
    return { ...parsed, payload } as StoredExpenseDraft;
  } catch {
    return null;
  }
}

function matchesContext(draft: StoredExpenseDraft, context: DraftContext) {
  return draft.actor_user_id === context.actorUserId
    && draft.group_id === context.groupId
    && draft.space_id === context.spaceId
    && draft.mode === context.mode
    && draft.operation === context.operation
    && draft.resource_id === context.resourceId;
}

function readIndex(context: DraftContext): string[] {
  try {
    const parsed = z.array(z.string().startsWith(`${prefix}:`)).safeParse(
      JSON.parse(window.localStorage.getItem(scopeKey(context)) ?? '[]'),
    );
    return parsed.success ? [...new Set(parsed.data)] : [];
  } catch {
    return [];
  }
}

export function loadExpenseDraft(context: DraftContext): DraftLoadResult {
  const raw = window.localStorage.getItem(storageKey(context));
  if (raw === null) return { state: 'MISSING' };
  const draft = parseStored(raw);
  if (!draft || !matchesContext(draft, context)) return { state: 'CORRUPT' };
  if (!context.writable) return { state: 'BLOCKED' };
  if (draft.space_version !== context.spaceVersion
    || draft.record_version !== context.recordVersion) {
    return { state: 'STALE', draft };
  }
  return { state: 'READY', draft };
}

export function listExpenseDrafts(context: DraftContext): StoredExpenseDraft[] {
  return readIndex(context).flatMap((key) => {
    const draft = parseStored(window.localStorage.getItem(key));
    return draft
      && draft.actor_user_id === context.actorUserId
      && draft.group_id === context.groupId
      && draft.space_id === context.spaceId
      && draft.mode === context.mode
      ? [draft]
      : [];
  });
}

export function saveExpenseDraft(
  context: DraftContext,
  rawPayload: unknown,
): { ok: true; draft: StoredExpenseDraft } | { ok: false; reason: 'INVALID_PAYLOAD' | 'STORAGE_UNAVAILABLE' } {
  const payloadResult = payloadSchemas[context.mode].safeParse(rawPayload);
  if (!payloadResult.success) return { ok: false, reason: 'INVALID_PAYLOAD' };
  const contextResult = z.object({
    actorUserId: uuid,
    groupId: uuid.nullable(),
    spaceId: uuid,
    mode: z.enum(['PERSONAL_EXPENSES', 'SHARED_EXPENSES', 'POOLED_FUND']),
    operation: z.enum(['CREATE', 'UPDATE']),
    resourceId: uuid.nullable(),
    spaceVersion: safeVersion,
    recordVersion: safeVersion.nullable(),
    writable: z.boolean(),
  }).strict().safeParse(context);
  if (!contextResult.success) return { ok: false, reason: 'INVALID_PAYLOAD' };
  const key = storageKey(context);
  const fingerprint = JSON.stringify(payloadResult.data);
  const existing = parseStored(window.localStorage.getItem(key));
  const requestId = existing?.fingerprint === fingerprint
    ? existing.request_id
    : crypto.randomUUID();
  const draft = storedDraftSchema.parse({
    schema_version: 1,
    status: 'NOT_SUBMITTED',
    actor_user_id: context.actorUserId,
    group_id: context.groupId,
    space_id: context.spaceId,
    mode: context.mode,
    operation: context.operation,
    resource_id: context.resourceId,
    space_version: context.spaceVersion,
    record_version: context.recordVersion,
    saved_at: new Date().toISOString(),
    request_id: requestId,
    fingerprint,
    payload: payloadResult.data,
  }) as StoredExpenseDraft;
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
    window.localStorage.setItem(scopeKey(context), JSON.stringify([...new Set([...readIndex(context), key])]));
    return { ok: true, draft };
  } catch {
    return { ok: false, reason: 'STORAGE_UNAVAILABLE' };
  }
}

export function discardExpenseDraft(context: DraftContext): void {
  const key = storageKey(context);
  try {
    window.localStorage.removeItem(key);
    const remaining = readIndex(context).filter((value) => value !== key);
    if (remaining.length) window.localStorage.setItem(scopeKey(context), JSON.stringify(remaining));
    else window.localStorage.removeItem(scopeKey(context));
  } catch {
    // Recovery UI will continue to report the still-present draft if removal fails.
  }
}
