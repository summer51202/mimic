import { useTranslations } from "next-intl";
import Link from "next/link";

import type { Group } from "@/shared/api/domain-contracts";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import styles from "./group-management.module.css";

interface GroupListProps {
  groups: Group[];
}

export function GroupList({ groups }: GroupListProps) {
  const t = useTranslations("groups");
  return (
    <PixelFrame data-frame="group-list">
      <ul className={styles.groupList}>
        {groups.map((group) => (
          <li className={styles.groupCard} key={group.id}>
            <Link className={styles.groupIdentity} data-contain-text href={`/app/groups/${group.id}`}>
              <strong className={styles.groupName} data-contain-text>{group.name}</strong>
              <span>
                {t("typeAndCurrency", { type: t(group.group_type.toLowerCase() === "couple" ? "duo" : "party"), currency: group.default_currency })}
              </span>
            </Link>
            <Link href={`/app?group=${encodeURIComponent(group.id)}`}>
              {t("openChests")}
            </Link>
          </li>
        ))}
      </ul>
    </PixelFrame>
  );
}
