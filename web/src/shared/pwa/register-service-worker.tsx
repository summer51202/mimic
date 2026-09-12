"use client";

import { Serwist } from "@serwist/window";
import { useCallback, useEffect, useState } from "react";

import { UpdateNotice } from "./update-notice";

declare global {
  interface Window {
    serwist?: Serwist;
  }
}

const isProduction = process.env.NODE_ENV === "production";

export function shouldReloadForControllerChange(wasControlled: boolean, dirty: boolean) {
  return wasControlled && !dirty;
}

function isFormDirty() {
  for (const form of Array.from(document.forms)) {
    if (form.matches('[data-dirty="true"]')) {
      return true;
    }
  }

  for (const element of Array.from(
    document.querySelectorAll("input, textarea, select"),
  )) {
    if (element instanceof HTMLInputElement) {
      if (element.type === "checkbox" || element.type === "radio") {
        if (element.checked !== element.defaultChecked) {
          return true;
        }
      } else if (element.value !== element.defaultValue) {
        return true;
      }
    }

    if (
      element instanceof HTMLTextAreaElement &&
      element.value !== element.defaultValue
    ) {
      return true;
    }

    if (element instanceof HTMLSelectElement) {
      const hasChangedSelection = Array.from(element.options).some(
        (option) => option.selected !== option.defaultSelected,
      );

      if (hasChangedSelection) {
        return true;
      }
    }
  }

  return false;
}

export function RegisterServiceWorker() {
  const [isUpdateWaiting, setIsUpdateWaiting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const refreshDirtyState = useCallback(() => {
    const nextDirtyState = isFormDirty();

    setIsDirty(nextDirtyState);
    return nextDirtyState;
  }, []);

  useEffect(() => {
    if (!isProduction || !("serviceWorker" in navigator)) {
      return;
    }

    const wasControlled = Boolean(navigator.serviceWorker.controller);
    const serwist =
      window.serwist ?? new Serwist("/sw.js", { scope: "/", type: "module" });
    window.serwist = serwist;

    const onWaiting = () => {
      refreshDirtyState();
      setIsUpdateWaiting(true);
    };

    const onControlling = () => {
      const dirty = isFormDirty();
      if (shouldReloadForControllerChange(wasControlled, dirty)) {
        window.location.reload();
      } else if (wasControlled && dirty) {
        setIsDirty(true);
        setIsUpdateWaiting(true);
      }
    };

    window.addEventListener("input", refreshDirtyState, true);
    window.addEventListener("change", refreshDirtyState, true);
    serwist.addEventListener("waiting", onWaiting);
    serwist.addEventListener("controlling", onControlling);

    void serwist
      .register()
      .then((registration) => {
        if (registration?.waiting) {
          onWaiting();
        }

        return registration?.update();
      })
      .catch(() => {
        setIsUpdateWaiting(false);
      });

    return () => {
      window.removeEventListener("input", refreshDirtyState, true);
      window.removeEventListener("change", refreshDirtyState, true);
      serwist.removeEventListener("waiting", onWaiting);
      serwist.removeEventListener("controlling", onControlling);
    };
  }, [refreshDirtyState]);

  const activateWaitingWorker = useCallback(() => {
    if (refreshDirtyState()) {
      return;
    }

    window.serwist?.messageSkipWaiting();
  }, [refreshDirtyState]);

  return (
    <UpdateNotice
      isDirty={isDirty}
      isVisible={isUpdateWaiting}
      onUpdate={activateWaitingWorker}
    />
  );
}
