import { listFunds } from "@/features/funds/fund-queries";
import { getGroup, listMembers } from "@/features/groups/group-queries";
import { GroupDetailView } from "@/features/groups/group-detail";
import { listGroupSharedSpaces } from "@/features/shared-expenses/shared-queries";
import { listGroupPooledSpaces } from "@/features/pooled-funds/pooled-queries";
import { AppReadFailure } from "@/shared/ui/app-read-failure";
import '@/features/shared-expenses/shared.css';
import '@/features/pooled-funds/pooled.css';

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { groupId } = await params;
  let reads;

  try {
    reads = await Promise.all([
      getGroup(groupId),
      listMembers(groupId),
      listFunds(groupId),
      listGroupSharedSpaces(groupId),
      listGroupPooledSpaces(groupId),
    ]);
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  const [group, members, funds, sharedSpaces, pooledSpaces] = reads;

  return <GroupDetailView funds={funds} group={group} members={members} sharedSpaces={sharedSpaces} pooledSpaces={pooledSpaces} />;
}
