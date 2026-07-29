import { listFunds } from "@/features/funds/fund-queries";
import { getGroup, listMembers } from "@/features/groups/group-queries";
import { GroupDetailView } from "@/features/groups/group-detail";

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { groupId } = await params;
  const [group, members, funds] = await Promise.all([
    getGroup(groupId),
    listMembers(groupId),
    listFunds(groupId),
  ]);

  return <GroupDetailView funds={funds} group={group} members={members} />;
}
