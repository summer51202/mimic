"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

import type { AppReadState } from "@/shared/api/read-state";
import { pixelUiRoles } from "@/shared/brand/pixel-ui-assets";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import styles from "./app-route-state.module.css";

type AppRouteStateVariant = AppReadState | "loading";

interface AppRouteStateProps {
  variant: AppRouteStateVariant;
  onRetry?: () => void;
  returnHref?: string;
}

export function AppRouteState({
  variant,
  onRetry,
  returnHref,
}: AppRouteStateProps) {
  const t = useTranslations("routeState");

  return (
    <section
      aria-labelledby="app-route-state-title"
      className={styles.page}
      role={variant === "loading" ? "status" : "alert"}
    >
      <PixelFrame className={styles.frame} variant="treasury">
        <Image
          alt={t("alt")}
          className={styles.mimiku}
          height={512}
          src={pixelUiRoles.blockingError}
          unoptimized
          width={512}
        />
        <div className={styles.copy}>
          <p className={styles.kicker}>{t("kicker")}</p>
          <h1 id="app-route-state-title">{t(`${variant}.title`)}</h1>
          <p>{t(`${variant}.message`)}</p>
          {onRetry || returnHref ? (
            <div className={styles.actions}>
              {onRetry ? (
                <PixelButton onClick={onRetry} type="button">
                  {t("retry")}
                </PixelButton>
              ) : null}
              {returnHref ? (
                <Link className="pixel-button" href={returnHref}>
                  {t("return")}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </PixelFrame>
    </section>
  );
}
