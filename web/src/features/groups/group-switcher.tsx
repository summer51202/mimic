import { useTranslations } from "next-intl";
import Link from "next/link";

import type { Group } from "@/shared/api/domain-contracts";

import styles from "./group-switcher.module.css";

interface GroupSwitcherProps {
  groups: Group[];
  selectedGroupId: string | null;
}

export function GroupSwitcher({ groups, selectedGroupId }: GroupSwitcherProps) {
  const t = useTranslations("groups");
  if (groups.length === 0) {
    return null;
  }

  return (
    <nav aria-label={t("choose")} className={styles.groupSwitcher}>
      {groups.map((group) => {
        const selected = group.id === selectedGroupId;

        return (
          <Link
            aria-current={selected ? "page" : undefined}
            className={styles.groupChip}
            data-current={selected ? "true" : undefined}
            href={`/app?group=${encodeURIComponent(group.id)}`}
            key={group.id}
          >
            {group.name}
          </Link>
        );
      })}
    </nav>
  );
}
