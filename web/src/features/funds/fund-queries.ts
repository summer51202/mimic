import {
  fundSchema,
  fundSummarySchema,
  type Fund,
  type FundSummary,
  type Group,
} from "@/shared/api/domain-contracts";
import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";
import { classifyReadError } from "@/shared/api/read-state";

import { listGroups } from "../groups/group-queries";

export type GroupFundsSection = {
  group: Group;
  funds: Fund[];
  state: "ready" | "forbidden";
};

export async function listFunds(groupId: string): Promise<Fund[]> {
  const data = await authenticatedServerApi<unknown>(
    `/groups/${encodeURIComponent(groupId)}/funds`,
    { method: "GET" },
  );

  return fundSchema.array().parse(data);
}

export async function listFundsOverview(): Promise<GroupFundsSection[]> {
  const groups = await listGroups();
  const results = await Promise.allSettled(
    groups.map((group) => listFunds(group.id)),
  );

  return results.map((result, index) => {
    const group = groups[index];

    if (result.status === "fulfilled") {
      return { group, funds: result.value, state: "ready" };
    }

    if (classifyReadError(result.reason) === "forbidden") {
      return { group, funds: [], state: "forbidden" };
    }

    throw result.reason;
  });
}

export async function getFundSummary(fundId: string): Promise<FundSummary> {
  const data = await authenticatedServerApi<unknown>(
    `/funds/${encodeURIComponent(fundId)}/summary`,
    { method: "GET" },
  );

  return fundSummarySchema.parse(data);
}
