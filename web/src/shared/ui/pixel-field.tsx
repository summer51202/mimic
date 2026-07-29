"use client";

import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useId,
} from "react";

type PixelFieldProps = Omit<ComponentPropsWithoutRef<"input">, "children"> & {
  description?: ReactNode;
  error?: ReactNode;
  label: ReactNode;
};

export const PixelField = forwardRef<HTMLInputElement, PixelFieldProps>(
  function PixelField(
    {
      className,
      description,
      error,
      id,
      label,
      "aria-describedby": ariaDescribedBy,
      "aria-invalid": ariaInvalid,
      ...inputProps
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? `${generatedId}-input`;
    const descriptionId = description ? `${inputId}-description` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    const describedBy = [ariaDescribedBy, descriptionId, errorId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="pixel-field">
        <label className="pixel-field__label" htmlFor={inputId}>
          {label}
        </label>
        {description ? (
          <p className="pixel-field__description" id={descriptionId}>
            {description}
          </p>
        ) : null}
        <input
          {...inputProps}
          ref={ref}
          aria-describedby={describedBy || undefined}
          aria-invalid={error ? "true" : ariaInvalid}
          className={["pixel-field__input", className]
            .filter(Boolean)
            .join(" ")}
          id={inputId}
        />
        {error ? (
          <p className="pixel-field__error" id={errorId} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
