import type { ReactNode } from "react";

import { requireSession } from "@/shared/auth/require-session";
import { PixelAppShell } from "@/shared/navigation/pixel-app-shell";

type AppLayoutProps = {
  children: ReactNode;
};

export default async function AppLayout({ children }: AppLayoutProps) {
  await requireSession();

  return <PixelAppShell>{children}</PixelAppShell>;
}
