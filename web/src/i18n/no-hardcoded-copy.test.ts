import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const scope = [
  "app/(public)/layout.tsx", "app/(public)/page.tsx", "app/(public)/features/page.tsx",
  "app/(public)/privacy/page.tsx", "app/(public)/terms/page.tsx", "app/(public)/invite/[code]/page.tsx",
  "shared/brand/site-header.tsx", "shared/brand/landing-stage.tsx", "shared/brand/landing-interactions.ts",
  "shared/brand/landing-room.tsx", "shared/brand/public-copy.ts", "shared/brand/brand.ts",
  "features/invitations/invite-accept-panel.tsx", "features/invitations/invite-errors.ts",
  "app/(auth)/login/page.tsx", "app/(auth)/register/page.tsx",
  "features/auth/auth-form.tsx", "features/auth/auth-schema.ts",
  "shared/navigation/app-navigation.tsx", "shared/navigation/pixel-app-shell.tsx",
  "shared/pwa/update-notice.tsx", "shared/scene/scene-pause-button.tsx",
  "app/app/settings/page.tsx", "features/settings/settings-form.tsx",
  "shared/ui/app-route-state.tsx", "app/app/error.tsx", "app/app/not-found.tsx", "app/app/loading.tsx",
  "app/app/spaces/[spaceId]/loading.tsx", "app/global-error.tsx", "shared/api/errors.ts",
  "app/layout.tsx", "app/manifest.ts", "app/sw.ts", "app/offline/page.tsx",
  "shared/i18n/language-switch.tsx",
];

it("keeps hardcoded CJK copy out of the Phase 2I-1 source files", () => {
  const found: string[] = [];
  for (const path of scope) {
    const source = readFileSync(join(process.cwd(), "src", path), "utf8");
    for (const [index, line] of source.split("\n").entries()) {
      if (line.includes('aria-label="Primary app sections"') || /\/\/ i18n-exempt: \S/.test(line)) continue;
      if (/[\u3040-\u30ff\u3400-\u9fff]/.test(line)) found.push(`${path}:${index + 1}`);
    }
  }
  expect(found).toEqual([]);
});
