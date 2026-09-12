"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { SharedSpaceList } from "@/features/shared-expenses/shared-space-list";
import { PooledSpaceList } from "@/features/pooled-funds/pooled-space-list";
import type { FinancialSpace } from "@/shared/api/financial-space-contracts";
import type { GroupDetail, Member } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import { ArchiveEmptyGroupDialog } from "./archive-empty-group-dialog";
import { GroupForm } from "./group-form";
import { LeaveGroupDialog } from "./leave-group-dialog";
import { MemberRoster } from "./member-roster";
import styles from "./group-management.module.css";

interface GroupDetailViewProps {
  group: GroupDetail;
  members: Member[];
  sharedSpaces?: FinancialSpace[];
  pooledSpaces?: FinancialSpace[];
  onRefresh?: () => void;
}

export function GroupDetailView({
  group,
  members,
  sharedSpaces = [],
  pooledSpaces = [],
  onRefresh,
}: GroupDetailViewProps) {
  const [renaming, setRenaming] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const isOwner = group.role.toLowerCase() === "owner";

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
        <SharedSpaceList groupId={group.id} spaces={sharedSpaces} defaultCurrency={group.default_currency} />
        <PooledSpaceList groupId={group.id} spaces={pooledSpaces} defaultCurrency={group.default_currency} />
        {renaming ? (
          <PixelFrame>
            <h2>Rename</h2>
            <GroupForm group={group} mode="rename" onSuccess={refresh} />
          </PixelFrame>
        ) : null}
      </div>

      {isOwner ? (
        <OwnerArchiveControls
          groupId={group.id}
          groupName={group.name}
          key={`${group.id}\u001f${group.name}`}
        />
      ) : null}

      <LeaveGroupDialog
        groupId={group.id}
        groupName={group.name}
        onClose={() => setLeaving(false)}
        open={leaving}
      />
    </section>
  );
}

function OwnerArchiveControls({
  groupId,
  groupName,
}: {
  groupId: string;
  groupName: string;
}) {
  const [archiving, setArchiving] = useState(false);
  const dangerZoneHeadingId = useId();

  return (
    <>
      <section
        aria-labelledby={dangerZoneHeadingId}
        className={styles.dangerZone}
      >
        <div>
          <h2 id={dangerZoneHeadingId}>Danger zone</h2>
          <p>Remove a group only when bookkeeping has not started.</p>
        </div>
        <PixelButton
          emphasis="danger"
          onClick={() => setArchiving(true)}
          type="button"
        >
          Delete empty group
        </PixelButton>
      </section>
      <ArchiveEmptyGroupDialog
        groupId={groupId}
        groupName={groupName}
        onClose={() => setArchiving(false)}
        open={archiving}
      />
    </>
  );
}
