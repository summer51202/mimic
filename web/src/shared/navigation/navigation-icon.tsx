"use client";

import Image from "next/image";

export function NavigationIcon({ name, size }: { name: string; size: 32 | 48 }) {
  return (
    <Image
      src={`/pixel-ui/v1/icons/ui/${name}.png`}
      width={size}
      height={size}
      unoptimized
      alt=""
      aria-hidden="true"
      onError={(event) => { event.currentTarget.style.visibility = "hidden"; }}
    />
  );
}
