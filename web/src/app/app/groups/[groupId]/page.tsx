import { getGroup, listMembers } from "@/features/groups/group-queries";
import { GroupDetailView } from "@/features/groups/group-detail";

interface GroupDetailPageProps {
  params: Promise<{ groupId: string }>;
}

export default async function GroupDetailPage({
  params,
}: GroupDetailPageProps) {
  const { groupId } = await params;
  const [group, members] = await Promise.all([
    getGroup(groupId),
    listMembers(groupId),
  ]);

  return <GroupDetailView group={group} members={members} />;
}
