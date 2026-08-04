"use client";

import Image from "next/image";
import Link from "next/link";

import type { AppReadState } from "@/shared/api/read-state";
import { pixelUiAssets } from "@/shared/brand/pixel-ui-assets";
import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelFrame } from "@/shared/ui/pixel-frame";

import styles from "./app-route-state.module.css";

type AppRouteStateVariant = AppReadState | "loading";

interface AppRouteStateProps {
  variant: AppRouteStateVariant;
  onRetry?: () => void;
  returnHref?: string;
}

const copy: Record<AppRouteStateVariant, { title: string; message: string }> = {
  forbidden: {
    title: "Treasury access blocked",
    message: "You do not have access to this treasury.",
  },
  "not-found": {
    title: "Treasury not found",
    message: "This treasury could not be found.",
  },
  unavailable: {
    title: "Treasury connection paused",
    message:
      "Mimiku cannot reach the treasury right now. Your data is safe. Try again in a moment.",
  },
  unknown: {
    title: "Something went wrong",
    message: "Mimiku hit an unexpected problem while opening this screen.",
  },
  loading: {
    title: "Opening treasury",
    message: "Mimiku is opening the treasury...",
  },
};

export function AppRouteState({
  variant,
  onRetry,
  returnHref,
}: AppRouteStateProps) {
  const content = copy[variant];

  return (
    <section
      aria-labelledby="app-route-state-title"
      className={styles.page}
      role={variant === "loading" ? "status" : "alert"}
    >
      <PixelFrame className={styles.frame} variant="treasury">
        <Image
          alt="Mimiku standing guard"
          className={styles.mimiku}
          height={512}
          src={pixelUiAssets.mimiku.serious}
          width={512}
        />
        <div className={styles.copy}>
          <p className={styles.kicker}>mimic recovery log</p>
          <h1 id="app-route-state-title">{content.title}</h1>
          <p>{content.message}</p>
          {onRetry || returnHref ? (
            <div className={styles.actions}>
              {onRetry ? (
                <PixelButton onClick={onRetry} type="button">
                  Retry
                </PixelButton>
              ) : null}
              {returnHref ? (
                <Link className="pixel-button" href={returnHref}>
                  Return to overview
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>
      </PixelFrame>
    </section>
  );
}
