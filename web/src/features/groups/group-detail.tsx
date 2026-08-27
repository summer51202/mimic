"use client";

import Link from "next/link";
import { useState } from "react";

import { FundList } from "@/features/funds/fund-list";
import type { Fund, GroupDetail, Member } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import { GroupForm } from "./group-form";
import { LeaveGroupDialog } from "./leave-group-dialog";
import { MemberRoster } from "./member-roster";
import styles from "./group-management.module.css";

interface GroupDetailViewProps {
  funds?: Fund[];
  group: GroupDetail;
  members: Member[];
  onRefresh?: () => void;
}

export function GroupDetailView({
  funds = [],
  group,
  members,
  onRefresh,
}: GroupDetailViewProps) {
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);

  function refresh() {
    setRenaming(false);

    if (onRefresh) {
      onRefresh();
      return;
    }

    window.location.reload();
  }

  return (
    <section className={styles.page}>
      <header className={styles.header} data-frame="group-detail-header">
        <p>group detail</p>
        <h1 className={styles.groupName} data-contain-text>{group.name}</h1>
        <p>
          {group.group_type} · {group.default_currency}
        </p>
      </header>

      <div className={styles.actions}>
        <Link className="pixel-button" href={`/app/groups/${group.id}/invite`}>
          Invite members
        </Link>
        <PixelButton onClick={() => setRenaming((value) => !value)} type="button">
          Rename group
        </PixelButton>
        <PixelButton
          emphasis="danger"
          onClick={() => setLeaving(true)}
          type="button"
        >
          Leave group
        </PixelButton>
      </div>

      <div className={styles.grid}>
        <PixelFrame>
          <h2>Members</h2>
          <MemberRoster members={members} />
        </PixelFrame>
        <FundList funds={funds} groupId={group.id} />
        {renaming ? (
          <PixelFrame>
            <h2>Rename</h2>
            <GroupForm group={group} mode="rename" onSuccess={refresh} />
          </PixelFrame>
        ) : null}
      </div>

      <LeaveGroupDialog
        groupId={group.id}
        groupName={group.name}
        onClose={() => setLeaving(false)}
        open={leaving}
      />
    </section>
  );
}
