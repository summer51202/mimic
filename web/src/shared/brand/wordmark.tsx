import type { ComponentPropsWithoutRef, ElementType } from "react";
import { brand } from "./brand";

type WordmarkElement = "div" | "span" | "p" | "h1" | "h2";

type WordmarkProps<TElement extends WordmarkElement = "div"> = {
  as?: TElement;
} & Omit<ComponentPropsWithoutRef<TElement>, "children">;

export function Wordmark<TElement extends WordmarkElement = "div">({
  as,
  className,
  ...props
}: WordmarkProps<TElement>) {
  const Component = (as ?? "div") as ElementType;
  const classes = ["mimic-wordmark", className].filter(Boolean).join(" ");

  return (
    <Component {...props} className={classes}>
      <span className="mimic-wordmark__product">{brand.productName}</span>
      <span className="mimic-wordmark__character">
        {brand.characterNameZh} / {brand.characterNameEn}
      </span>
    </Component>
  );
}
