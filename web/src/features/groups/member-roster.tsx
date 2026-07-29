import Image from "next/image";

import type { Member } from "@/shared/api/domain-contracts";
import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";

import styles from "./group-management.module.css";

interface MemberRosterProps {
  members: Member[];
}

export function MemberRoster({ members }: MemberRosterProps) {
  return (
    <ul className={styles.roster}>
      {members.map((member, index) => (
        <li className={styles.member} key={member.user_id}>
          <Image
            alt={`Avatar for ${member.display_name}`}
            height={48}
            src={pixelUiAssets.avatars[index % pixelUiAssets.avatars.length]}
            width={48}
          />
          <div className={styles.memberMeta}>
            <strong>{member.display_name}</strong>
            <span>{member.status}</span>
          </div>
          <span className={styles.role}>{roleLabel(member.role)}</span>
        </li>
      ))}
    </ul>
  );
}

function roleLabel(role: string): string {
  return role.toLowerCase() === "owner" ? "Owner" : "Member";
}
