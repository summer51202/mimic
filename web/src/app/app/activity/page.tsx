import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActivityPage } from "@/features/activity/activity-page";
import { getFundActivity } from "@/features/activity/activity-queries";
import { getFundSummary, listFunds } from "@/features/funds/fund-queries";
import { getGroup, listGroups, listMembers } from "@/features/groups/group-queries";
import { selectGroupId } from "@/features/groups/group-selection";
import { ApiError } from "@/shared/api/errors";
import { AppReadFailure } from "@/shared/ui/app-read-failure";
import { PixelFrame } from "@/shared/ui/pixel-frame";

type Search = { fund?: string | string[]; action?: string | string[] };

export default async function ActivityRoute({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  const emptySearch: Search = {};
  const [params, cookieStore] = await Promise.all([
    searchParams ?? Promise.resolve(emptySearch),
    cookies(),
  ]);

  let groups;
  try {
    groups = await listGroups();
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  const groupId = selectGroupId(
    null,
    cookieStore.get("mimic_group")?.value,
    groups,
  );
  if (!groupId) {
    return (
      <PixelFrame>
        <h1>Activity</h1>
        <p>Create or join a group before recording activity.</p>
        <Link className="pixel-button" href="/app/groups">View groups</Link>
      </PixelFrame>
    );
  }

  let context;
  try {
    context = await Promise.all([
      getGroup(groupId),
      listFunds(groupId),
      listMembers(groupId),
    ]);
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  const [group, funds, members] = context;
  if (!funds.length) {
    return (
      <PixelFrame>
        <h1>Activity</h1>
        <p>Create a fund before recording activity.</p>
        <Link
          className="pixel-button"
          href={`/app/groups/${encodeURIComponent(groupId)}/funds/new`}
        >
          Create fund
        </Link>
      </PixelFrame>
    );
  }

  const requestedFund = first(params.fund);
  if (!requestedFund) {
    redirect(`/app/activity?fund=${encodeURIComponent(funds[0]!.id)}`);
  }

  const fund = funds.find((item) => item.id === requestedFund);
  if (!fund) {
    return <AppReadFailure error={new ApiError(404, "FUND_NOT_FOUND")} />;
  }

  let detail;
  try {
    detail = await Promise.all([
      getFundSummary(fund.id),
      getFundActivity(fund.id),
    ]);
  } catch (error) {
    return <AppReadFailure error={error} />;
  }

  const [summary, records] = detail;
  return (
    <ActivityPage
      funds={funds}
      members={members}
      records={records}
      selectedFundId={fund.id}
      currentUserId={group.current_user_id}
      action={first(params.action) ?? null}
      balanceMinor={summary.fund.cash_balance_minor}
    />
  );
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
