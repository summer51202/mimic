import Image from "next/image";
import Link from "next/link";

import type { Group, GroupDashboard } from "@/shared/api/domain-contracts";
import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";
import { formatMinorUnit } from "@/shared/finance/minor-unit";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import { GroupSwitcher } from "./group-switcher";
import styles from "./treasury-dashboard.module.css";

interface TreasuryDashboardProps {
  dashboard: GroupDashboard | null;
  groups: Group[];
  selectedGroupId: string | null;
}

export function TreasuryDashboard({
  dashboard,
  groups,
  selectedGroupId,
}: TreasuryDashboardProps) {
  if (!dashboard) {
    return (
      <section className={styles.emptyState}>
        <Image
          alt=""
          className={styles.emptyMimiku}
          height={160}
          priority
          src={pixelUiAssets.mimiku.emptyGroup}
          width={160}
        />
        <div className={styles.emptyCopy}>
          <p className={styles.kicker}>mimic adventure log</p>
          <h1>建立你們的共同寶庫</h1>
          <p>咪咪庫已經準備好地圖，先建立群組，就能開始一起存、一起花。</p>
          <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
            建立群組
          </Link>
        </div>
      </section>
    );
  }

  const primaryCurrency =
    dashboard.currencies.find(
      (currency) => currency.currency === dashboard.group.default_currency,
    ) ?? dashboard.currencies[0];

  return (
    <section className={styles.dashboard} aria-labelledby="treasury-title">
      <div className={styles.topBar}>
        <div>
          <p className={styles.kicker}>shared treasury</p>
          <h1 id="treasury-title">{dashboard.group.name}</h1>
        </div>
        <GroupSwitcher groups={groups} selectedGroupId={selectedGroupId} />
      </div>

      <PixelFrame className={styles.hero} variant="treasury">
        <picture>
          <source
            media="(min-width: 48rem)"
            srcSet={pixelUiAssets.scenes.treasuryDesktop}
          />
          <Image
            alt=""
            className={styles.heroScene}
            height={1024}
            priority
            src={pixelUiAssets.scenes.treasuryMobile}
            width={512}
          />
        </picture>
        <div className={styles.heroContent}>
          <p>目前餘額</p>
          <strong>
            {primaryCurrency
              ? formatMinorUnit(
                  primaryCurrency.cash_balance_minor,
                  primaryCurrency.currency,
                  "en-US",
                )
              : "$0.00"}
          </strong>
        </div>
      </PixelFrame>

      <div className={styles.contentGrid}>
        <PixelFrame className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>成員 ({primaryCurrency?.current.member_positions.length ?? 0})</h2>
          </div>
          <ul className={styles.memberList}>
            {(primaryCurrency?.current.member_positions ?? []).map(
              (member, index) => (
                <li className={styles.memberItem} key={member.user_id}>
                  <Image
                    alt=""
                    className={styles.avatar}
                    height={48}
                    src={pixelUiAssets.avatars[index % pixelUiAssets.avatars.length]}
                    width={48}
                  />
                  <span>{member.display_name}</span>
                  <strong>
                    {formatMinorUnit(
                      member.position_minor,
                      primaryCurrency?.currency ?? "TWD",
                      "en-US",
                    )}
                  </strong>
                </li>
              ),
            )}
          </ul>
        </PixelFrame>

        <PixelFrame className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Funds</h2>
            <Link href="/app/funds/new">新增</Link>
          </div>
          <ul className={styles.fundList}>
            {(primaryCurrency?.funds ?? []).map((fund) => (
              <li key={fund.fund_id}>
                <Link className={styles.fundLink} href={`/app/funds/${fund.fund_id}`}>
                  <span>{fund.name}</span>
                  <strong>
                    {formatMinorUnit(
                      fund.cash_balance_minor,
                      primaryCurrency?.currency ?? "TWD",
                      "en-US",
                    )}
                  </strong>
                </Link>
              </li>
            ))}
          </ul>
        </PixelFrame>
      </div>
    </section>
  );
}
