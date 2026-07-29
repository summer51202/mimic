interface SelectableGroup {
  id: string;
  status?: string | null;
}

export function selectGroupId(
  urlChoice: string | null | undefined,
  rememberedChoice: string | null | undefined,
  groups: SelectableGroup[],
): string | null {
  const activeGroups = groups.filter(isActiveGroup);

  return (
    findActiveGroupId(urlChoice, activeGroups) ??
    findActiveGroupId(rememberedChoice, activeGroups) ??
    activeGroups[0]?.id ??
    null
  );
}

function findActiveGroupId(
  groupId: string | null | undefined,
  groups: SelectableGroup[],
): string | null {
  if (!groupId) {
    return null;
  }

  return groups.some((group) => group.id === groupId) ? groupId : null;
}

function isActiveGroup(group: SelectableGroup): boolean {
  return group.status === undefined || group.status === null || group.status === "active";
}
