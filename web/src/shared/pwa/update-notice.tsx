"use client";

import { useEffect, useState } from "react";

type UpdateNoticeProps = {
  isDirty: boolean;
  isVisible: boolean;
  onUpdate: () => void;
};

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setPrefersReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);

    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

export function UpdateNotice({
  isDirty,
  isVisible,
  onUpdate,
}: UpdateNoticeProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!isVisible) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      style={{
        position: "fixed",
        right: "1rem",
        bottom: "1rem",
        zIndex: 50,
        display: "grid",
        gap: "0.75rem",
        maxWidth: "min(24rem, calc(100vw - 2rem))",
        border: "2px solid var(--mimic-color-ink)",
        borderRadius: "var(--mimic-radius-2)",
        background: "var(--mimic-color-surface-raised)",
        boxShadow: "var(--mimic-shadow-pixel)",
        color: "var(--mimic-color-ink)",
        padding: "1rem",
        transform: "translateZ(0)",
        transition: prefersReducedMotion
          ? "none"
          : "transform 160ms ease, opacity 160ms ease",
      }}
    >
      <p style={{ fontWeight: 800 }}>mimic 有新版本</p>
      <p style={{ lineHeight: 1.5 }}>
        {isDirty
          ? "先保留目前輸入內容，完成或清空表單後再更新。"
          : "更新已準備好，可以切換到最新的離線外殼。"}
      </p>
      <button
        className="pixel-button"
        data-emphasis="primary"
        type="button"
        onClick={onUpdate}
        disabled={isDirty}
      >
        更新
      </button>
    </aside>
  );
}
