import { loadSharedWorkspace } from '@/features/shared-expenses/shared-queries';
import { SharedWorkspace } from '@/features/shared-expenses/shared-workspace';
import { loadPooledWorkspace } from '@/features/pooled-funds/pooled-queries';
import { PooledWorkspace } from '@/features/pooled-funds/pooled-workspace';
import { authenticatedServerApi } from '@/shared/api/authenticated-server-api';
import { financialSpaceSchema } from '@/shared/api/financial-space-contracts';
import { AppReadFailure } from '@/shared/ui/app-read-failure';
import '@/features/shared-expenses/shared.css';
import '@/features/pooled-funds/pooled.css';

export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  let workspace:
    | { mode: 'POOLED_FUND'; initial: Awaited<ReturnType<typeof loadPooledWorkspace>> }
    | { mode: 'SHARED_EXPENSES'; initial: Awaited<ReturnType<typeof loadSharedWorkspace>> };

  try {
    const space = financialSpaceSchema.parse(await authenticatedServerApi(`/spaces/${spaceId}`, { method: 'GET' }));
    if (space.access !== 'PARTICIPANT') throw new Error('SPACE_NOT_FOUND');
    if (space.mode === 'POOLED_FUND') workspace = { mode: space.mode, initial: await loadPooledWorkspace(spaceId) };
    else if (space.mode === 'SHARED_EXPENSES') workspace = { mode: space.mode, initial: await loadSharedWorkspace(spaceId) };
    else throw new Error('SPACE_NOT_FOUND');
  }
  catch (error) { return <AppReadFailure error={error} />; }

  if (workspace.mode === 'POOLED_FUND') return <PooledWorkspace initial={workspace.initial} />;
  return <SharedWorkspace initial={workspace.initial} />;
}
