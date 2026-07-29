"use client";

import {
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
} from "react";

import { PixelButton } from "./pixel-button";
import { PixelFrame } from "./pixel-frame";

type PixelDialogProps = Omit<HTMLAttributes<HTMLDialogElement>, "title"> & {
  closeLabel?: string;
  description?: ReactNode;
  onClose: () => void;
  open: boolean;
  title: ReactNode;
};

export function PixelDialog({
  children,
  className,
  closeLabel = "Close dialog",
  description,
  onClose,
  onKeyDown,
  open,
  title,
  ...props
}: PixelDialogProps) {
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const descriptionId = description ? `${dialogId}-description` : undefined;
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    if (open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;

      if (typeof dialog.showModal === "function" && !dialog.open) {
        dialog.showModal();
      } else if (typeof dialog.showModal !== "function") {
        dialog.setAttribute("open", "");
      }

      return () => {
        if (dialog.open && typeof dialog.close === "function") {
          dialog.close();
        } else {
          dialog.removeAttribute("open");
        }
      };
    }

    if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }

    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, [open]);

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    onKeyDown?.(event);

    if (!event.defaultPrevented && event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  }

  return (
    <dialog
      {...props}
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className={["pixel-dialog", className].filter(Boolean).join(" ")}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
      role="dialog"
    >
      <PixelFrame variant="dialog" className="pixel-dialog__frame">
        <div className="pixel-dialog__header">
          <h2 className="pixel-dialog__title" id={titleId}>
            {title}
          </h2>
          <PixelButton
            emphasis="ghost"
            iconOnlyLabel={closeLabel}
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">X</span>
          </PixelButton>
        </div>
        {description ? (
          <p className="pixel-dialog__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <div className="pixel-dialog__body">{children}</div>
      </PixelFrame>
    </dialog>
  );
}
