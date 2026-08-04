import Image from "next/image";
import Link from "next/link";

import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import type { GroupFundsSection } from "./fund-queries";
import { FundLedgerCard } from "./fund-ledger-card";
import styles from "./funds-overview.module.css";

interface FundsOverviewProps {
  sections: GroupFundsSection[];
}

export function FundsOverview({ sections }: FundsOverviewProps) {
  if (sections.length === 0) {
    return (
      <section className={styles.noGroups}>
        <Image
          alt="Mimiku waiting for a group"
          className={styles.mimiku}
          height={160}
          priority
          src={pixelUiAssets.mimiku.emptyGroup}
          width={160}
        />
        <div className={styles.emptyCopy} data-contain-text>
          <p className={styles.kicker}>fund quest</p>
          <h1>Your funds need a group</h1>
          <p>Create a shared group first, then Mimiku can keep each fund in its own treasury.</p>
          <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
            Create group
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="funds-title">
      <header className={styles.pageHeader} data-contain-text>
        <p className={styles.kicker}>treasury ledgers</p>
        <h1 id="funds-title">Your funds</h1>
      </header>

      <div className={styles.groupGrid}>
        {sections.map((section) => (
          <PixelFrame
            className={styles.groupFrame}
            data-frame="funds-group"
            data-testid="funds-group"
            key={section.group.id}
          >
            <header className={styles.groupHeader} data-contain-text>
              <div className={styles.groupTitle}>
                <p>{section.group.default_currency} treasury</p>
                <h2>{section.group.name}</h2>
              </div>
              <nav aria-label={`${section.group.name} fund actions`} className={styles.actions}>
                <Link href={`/app/groups/${section.group.id}`}>
                  View {section.group.name}
                </Link>
                <Link href={`/app/groups/${section.group.id}/funds/new`}>
                  Create fund for {section.group.name}
                </Link>
              </nav>
            </header>

            {section.state === "forbidden" ? (
              <p className={styles.notice} data-contain-text>
                You do not have permission to view this group&apos;s funds.
              </p>
            ) : section.funds.length === 0 ? (
              <div className={styles.emptyGroup}>
                <Image
                  alt="Mimiku with an empty fund ledger"
                  className={styles.mimiku}
                  height={112}
                  src={pixelUiAssets.mimiku.emptyFund}
                  width={112}
                />
                <p data-contain-text>No funds here yet.</p>
              </div>
            ) : (
              <ul className={styles.fundList} data-contain-text>
                {section.funds.map((fund) => (
                  <FundLedgerCard fund={fund} key={fund.id} />
                ))}
              </ul>
            )}
          </PixelFrame>
        ))}
      </div>
    </section>
  );
}
