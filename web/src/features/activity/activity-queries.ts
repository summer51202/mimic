import {
  contributionSchema,
  expenseSchema,
  type Contribution,
  type Expense,
} from "@/shared/api/domain-contracts";
import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

export type ActivityRecord =
  | (Contribution & { kind: "contribution" })
  | (Expense & { kind: "expense" });

const activityQuery = "page=1&page_size=50&sort=occurred_on_desc";

export async function getFundActivity(fundId: string): Promise<ActivityRecord[]> {
  const encodedFundId = encodeURIComponent(fundId);
  const [contributions, expenses] = await Promise.all([
    authenticatedServerApi<unknown>(
      `/funds/${encodedFundId}/contributions?${activityQuery}`,
      { method: "GET" },
    ),
    authenticatedServerApi<unknown>(
      `/funds/${encodedFundId}/expenses?${activityQuery}`,
      { method: "GET" },
    ),
  ]);

  return mergeActivityRecords(
    contributionSchema.array().parse(contributions),
    expenseSchema.array().parse(expenses),
  );
}

export function mergeActivityRecords(
  contributions: Contribution[],
  expenses: Expense[],
): ActivityRecord[] {
  return [
    ...contributions.map((record) => ({ ...record, kind: "contribution" as const })),
    ...expenses.map((record) => ({ ...record, kind: "expense" as const })),
  ].sort((left, right) =>
    right.occurred_on.localeCompare(left.occurred_on) ||
    left.kind.localeCompare(right.kind) ||
    left.id.localeCompare(right.id),
  );
}
