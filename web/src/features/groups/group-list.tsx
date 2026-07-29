import Link from "next/link";

import type { Group } from "@/shared/api/domain-contracts";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import styles from "./group-management.module.css";

interface GroupListProps {
  groups: Group[];
}

export function GroupList({ groups }: GroupListProps) {
  return (
    <PixelFrame>
      <ul className={styles.groupList}>
        {groups.map((group) => (
          <li className={styles.groupCard} key={group.id}>
            <Link href={`/app/groups/${group.id}`}>
              <strong>{group.name}</strong>
              <span>
                {group.group_type} · {group.default_currency}
              </span>
            </Link>
            <Link href={`/app?group=${encodeURIComponent(group.id)}`}>
              Open treasury
            </Link>
          </li>
        ))}
      </ul>
    </PixelFrame>
  );
}
