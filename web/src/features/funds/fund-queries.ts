import {
  fundSchema,
  fundSummarySchema,
  type Fund,
  type FundSummary,
} from "@/shared/api/domain-contracts";
import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

export async function listFunds(groupId: string): Promise<Fund[]> {
  const data = await authenticatedServerApi<unknown>(
    `/groups/${encodeURIComponent(groupId)}/funds`,
    { method: "GET" },
  );

  return fundSchema.array().parse(data);
}

export async function getFundSummary(fundId: string): Promise<FundSummary> {
  const data = await authenticatedServerApi<unknown>(
    `/funds/${encodeURIComponent(fundId)}/summary`,
    { method: "GET" },
  );

  return fundSummarySchema.parse(data);
}
