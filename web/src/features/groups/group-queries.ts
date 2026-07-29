import {
  groupDashboardSchema,
  groupDetailSchema,
  groupSchema,
  memberSchema,
  type Group,
  type GroupDashboard,
  type GroupDetail,
  type Member,
} from "@/shared/api/domain-contracts";
import { authenticatedServerApi } from "@/shared/api/authenticated-server-api";

export async function listGroups(): Promise<Group[]> {
  const data = await authenticatedServerApi<unknown>("/groups", {
    method: "GET",
  });

  return groupSchema.array().parse(data);
}

export async function getGroup(groupId: string): Promise<GroupDetail> {
  const data = await authenticatedServerApi<unknown>(
    `/groups/${encodeURIComponent(groupId)}`,
    { method: "GET" },
  );

  return groupDetailSchema.parse(data);
}

export async function listMembers(groupId: string): Promise<Member[]> {
  const data = await authenticatedServerApi<unknown>(
    `/groups/${encodeURIComponent(groupId)}/members`,
    { method: "GET" },
  );

  return memberSchema.array().parse(data);
}

export async function getGroupDashboard(
  groupId: string,
): Promise<GroupDashboard> {
  const data = await authenticatedServerApi<unknown>(
    `/groups/${encodeURIComponent(groupId)}/dashboard`,
    { method: "GET" },
  );

  return groupDashboardSchema.parse(data);
}
