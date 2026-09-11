type TermIdentity = { id: string; kind: string; scope: string; scopeKey: string; status: string };
export function normalizeTermName(name: string): string {
  const normalized = name.trim().normalize('NFKC').toLocaleLowerCase('en-US');
  if (!normalized || normalized.length > 120) throw new Error('TAXONOMY_NAME_INVALID');
  return normalized;
}
export function canMerge(source: TermIdentity, target: TermIdentity): boolean {
  return source.id !== target.id && source.scope !== 'SYSTEM' && source.status === 'ACTIVE' &&
    target.status === 'ACTIVE' && source.kind === target.kind &&
    (source.scopeKey === target.scopeKey || target.scope === 'SYSTEM');
}
export function resolveCanonical(id: string, terms: ReadonlyMap<string, { status: string; mergedIntoId: string | null }>): string {
  const seen = new Set<string>();
  while (true) {
    if (seen.has(id)) throw new Error('TAXONOMY_MERGE_CYCLE');
    seen.add(id);
    const term = terms.get(id);
    if (!term) throw new Error('TAXONOMY_NOT_FOUND');
    if (term.status !== 'MERGED') return id;
    if (!term.mergedIntoId) throw new Error('TAXONOMY_NOT_FOUND');
    id = term.mergedIntoId;
  }
}
export function rankTermIds(recent: string[], frequent: string[], context: string[], defaults: string[]): string[] {
  return [...new Set([...recent, ...frequent, ...context, ...defaults])];
}
