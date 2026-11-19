import { useTranslations } from "next-intl";
import Image from "next/image";

import type { Member } from "@/shared/api/domain-contracts";
import { pixelUiFiles } from "@/shared/brand/pixel-ui-assets";

import styles from "./group-management.module.css";

interface MemberRosterProps {
  members: Member[];
}

export function MemberRoster({ members }: MemberRosterProps) {
  const t = useTranslations("groups");
  return (
    <ul className={styles.roster} data-frame="member-roster">
      {members.map((member, index) => (
        <li className={styles.member} key={member.user_id}>
          <Image
            alt={t("avatar", { name: member.display_name })}
            data-pixel-avatar
            height={48}
            src={pixelUiFiles.avatars[index % pixelUiFiles.avatars.length]}
            unoptimized
            width={48}
          />
          <div className={styles.memberMeta}>
            <strong className={styles.memberName} data-contain-text>{member.display_name}</strong>
            <span className={styles.memberMimicId} data-contain-text>
              {member.mimic_id}
            </span>
            <span data-contain-text>{t(statusKey(member.status))}</span>
          </div>
          <span className={styles.role}>{t(member.role.toLowerCase() === "owner" ? "owner" : "member")}</span>
        </li>
      ))}
    </ul>
  );
}

function statusKey(status: string) {
  switch (status.toLowerCase()) {
    case "left": return "left";
    case "removed": return "removed";
    default: return "active";
  }
}
