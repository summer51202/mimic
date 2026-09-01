import { cookies } from "next/headers";

import { selectGroupId } from "@/features/groups/group-selection";
import { getGroupDashboard, listGroups } from "@/features/groups/group-queries";
import { waitForTreasuryOpening } from "@/features/groups/treasury-opening-delay";
import { TreasuryDashboard } from "@/features/groups/treasury-dashboard";
import { AppReadFailure } from "@/shared/ui/app-read-failure";

interface AppPageProps {
  searchParams?: Promise<{ group?: string | string[] }>;
}

const groupPreferenceCookie = "mimic_group";

export default async function AppPage({ searchParams }: AppPageProps) {
  const opening = waitForTreasuryOpening();
  const emptyParams: { group?: string | string[] } = {};
  const [params, cookieStore] = await Promise.all([
    searchParams ?? Promise.resolve(emptyParams),
    cookies(),
  ]);
  let groups;

  try {
    groups = await listGroups();
  } catch (error) {
    await opening;
    return <AppReadFailure error={error} />;
  }
  const urlGroup = Array.isArray(params.group) ? params.group[0] : params.group;
  const selectedGroupId = selectGroupId(
    urlGroup,
    cookieStore.get(groupPreferenceCookie)?.value,
    groups,
  );
  let dashboard = null;

  if (selectedGroupId) {
    try {
      dashboard = await getGroupDashboard(selectedGroupId);
    } catch (error) {
      await opening;
      return <AppReadFailure error={error} />;
    }
  }

  await opening;
  return (
    <TreasuryDashboard
      dashboard={dashboard}
      groups={groups}
      selectedGroupId={selectedGroupId}
    />
  );
}
