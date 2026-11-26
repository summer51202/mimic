import { useTranslations } from "next-intl";

import type { Member } from "@/shared/api/domain-contracts";

import { AvatarPortrait } from "../avatar/avatar-portrait";
import slot from "../avatar/avatar-slot.module.css";
import styles from "./group-management.module.css";

interface MemberRosterProps {
  members: Member[];
}

export function MemberRoster({ members }: MemberRosterProps) {
  const t = useTranslations("groups");
  const avatar = useTranslations("avatar");
  return (
    <ul className={styles.roster} data-frame="member-roster">
      {members.map((member) => (
        <li className={styles.member} key={member.user_id}>
          {member.avatar_class ? (
            <AvatarPortrait
              alt={avatar("rosterAlt", { name: member.display_name, class: avatar(`class.${member.avatar_class}`) })}
              avatarClass={member.avatar_class}
              size={48}
            />
          ) : (
            <>
              <AvatarPortrait avatarClass={null} size={48} />
              <span className={slot.visuallyHidden}>{avatar("rosterAltNone", { name: member.display_name })}</span>
            </>
          )}
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
