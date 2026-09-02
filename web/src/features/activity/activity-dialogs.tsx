"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { Fund, Member } from "@/shared/api/domain-contracts";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelDialog } from "@/shared/ui/pixel-dialog";

import { ContributionForm } from "./contribution-form";
import { ExpenseForm } from "./expense-form";
import styles from "./activity.module.css";

type ActivityAction = "contribution" | "expense" | null;

type ActivityDialogsProps = {
  fund: Fund;
  members: Member[];
  currentUserId: string;
  initialAction: string | null;
  onSuccess: (message: string) => void;
};

export function ActivityDialogs({
  fund,
  members,
  currentUserId,
  initialAction,
  onSuccess,
}: ActivityDialogsProps) {
  const router = useRouter();
  const incomingAction = normalizeAction(initialAction);
  const [syncedAction, setSyncedAction] = useState(incomingAction);
  const [action, setAction] = useState<ActivityAction>(incomingAction);

  if (syncedAction !== incomingAction) {
    setSyncedAction(incomingAction);
    setAction(incomingAction);
  }

  useEffect(() => {
    function followBrowserHistory() {
      setAction(normalizeAction(new URL(window.location.href).searchParams.get("action")));
    }

    window.addEventListener("popstate", followBrowserHistory);
    return () => window.removeEventListener("popstate", followBrowserHistory);
  }, []);

  function open(next: Exclude<ActivityAction, null>) {
    setAction(next);
    window.history.pushState(null, "", activityUrl(fund.id, next));
  }

  function close() {
    setAction(null);
    window.history.replaceState(null, "", activityUrl(fund.id));
  }

  function complete(kind: "contribution" | "expense") {
    close();
    onSuccess(kind === "contribution" ? "Contribution added." : "Expense added.");
    router.refresh();
  }

  return (
    <>
      <div className={styles.actions}>
        <PixelButton type="button" onClick={() => open("contribution")}>
          Add contribution
        </PixelButton>
        <PixelButton emphasis="secondary" type="button" onClick={() => open("expense")}>
          Add expense
        </PixelButton>
      </div>
      <PixelDialog
        title="Add contribution"
        description={`Record money added to ${fund.name}.`}
        open={action === "contribution"}
        onClose={close}
      >
        {action === "contribution" ? (
          <ContributionForm
            fundId={fund.id}
            currency={fund.currency}
            members={members}
            currentUserId={currentUserId}
            onSuccess={() => complete("contribution")}
          />
        ) : null}
      </PixelDialog>
      <PixelDialog
        title="Add expense"
        description={`Record spending from ${fund.name}.`}
        open={action === "expense"}
        onClose={close}
      >
        {action === "expense" ? (
          <ExpenseForm
            fundId={fund.id}
            currency={fund.currency}
            members={members}
            currentUserId={currentUserId}
            onSuccess={() => complete("expense")}
          />
        ) : null}
      </PixelDialog>
    </>
  );
}

function normalizeAction(value: string | null): ActivityAction {
  return value === "contribution" || value === "expense" ? value : null;
}

function activityUrl(fundId: string, action?: Exclude<ActivityAction, null>) {
  const base = `/app/activity?fund=${encodeURIComponent(fundId)}`;
  return action ? `${base}&action=${action}` : base;
}
