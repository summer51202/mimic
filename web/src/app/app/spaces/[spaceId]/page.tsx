import { loadSharedWorkspace } from '@/features/shared-expenses/shared-queries';
import { SharedWorkspace } from '@/features/shared-expenses/shared-workspace';
import { AppReadFailure } from '@/shared/ui/app-read-failure';
import '@/features/shared-expenses/shared.css';

export default async function Page({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = await params;
  let initial;
  try { initial = await loadSharedWorkspace(spaceId); }
  catch (error) { return <AppReadFailure error={error} />; }
  return <SharedWorkspace initial={initial} />;
}
