import { listFunds } from "@/features/funds/fund-queries";
import { getGroup, listMembers } from "@/features/groups/group-queries";
import { GroupDetailView } from "@/features/groups/group-detail";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

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
    ]);
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  const [group, members, funds] = reads;

  return <GroupDetailView funds={funds} group={group} members={members} />;
}
