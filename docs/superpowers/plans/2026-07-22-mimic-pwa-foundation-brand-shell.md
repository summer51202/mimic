# mimic PWA Foundation and Brand Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production foundation for the mimic Next.js PWA, including the controlled pixel-art brand shell, public pages, secure BFF authentication, installable offline shell, responsive authenticated shell, and visible Flutter rebrand.

**Architecture:** Create a new `web/` Next.js App Router application beside the existing NestJS `backend/` and Flutter `mobile/`. Public pages render through Next.js for search and sharing; browser authentication goes through Next.js route handlers that store NestJS JWTs in HttpOnly cookies. NestJS remains the only domain backend, and private financial data is never placed in service-worker caches.

**Tech Stack:** Next.js App Router, React, TypeScript, CSS Modules/global design tokens, Zod, Vitest, Testing Library, Playwright, Serwist service worker, existing NestJS API, existing Flutter application.

---

## Plan Boundary

This is the first independently shippable plan in the PWA migration series. It produces public pages, authentication, branding, PWA installation, and a protected application shell. It deliberately excludes group, fund, contribution, expense, and settlement screens.

Follow-up plans:

1. `mimic-pwa-groups-and-funds`
2. `mimic-pwa-financial-activity`
3. `mimic-pwa-settlements-and-cutover`

## File Structure

Create these focused boundaries:

- `web/src/app/(public)/`: indexable marketing, feature, policy, and invitation entry pages
- `web/src/app/(auth)/`: login and registration screens
- `web/src/app/app/`: protected responsive application shell
- `web/src/app/api/auth/`: same-origin BFF route handlers
- `web/src/features/auth/`: auth schemas, client actions, and components
- `web/src/shared/api/`: NestJS envelope/error parsing and server-only API access
- `web/src/shared/auth/`: cookie names, session types, refresh, and CSRF checks
- `web/src/shared/brand/`: mimic/Mimiku components and copy constants
- `web/src/shared/pwa/`: service-worker registration and update state
- `web/src/styles/`: pixel-aware tokens and global operational styles
- `web/public/brand/`: immutable source copy and approved derived raster assets
- `web/public/icons/`: favicon and install icons
- `web/e2e/`: browser acceptance tests

Do not import server-only auth or token code into client components.

### Task 1: Scaffold the Next.js Application and Test Harness

**Files:**
- Create: `web/package.json`
- Create: `web/tsconfig.json`
- Create: `web/next.config.ts`
- Create: `web/eslint.config.mjs`
- Create: `web/vitest.config.ts`
- Create: `web/playwright.config.ts`
- Create: `web/src/test/setup.ts`
- Create: `web/src/app/layout.tsx`
- Create: `web/src/app/page.tsx`

- [ ] **Step 1: Scaffold the application**

Run from the repository root:

```powershell
npx create-next-app@latest web --typescript --eslint --app --src-dir --import-alias "@/*" --no-tailwind --use-npm
```

Expected: `web/package.json`, App Router files, and `web/package-lock.json` exist.

- [ ] **Step 2: Install the test, schema, and PWA dependencies**

```powershell
Set-Location web
npm install zod @serwist/next serwist
npm install --save-dev vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @vitejs/plugin-react playwright @playwright/test
```

Expected: dependencies are recorded in `web/package.json` and install successfully.

- [ ] **Step 3: Add deterministic scripts**

Set `web/package.json` scripts to include:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 4: Configure Vitest**

Create `web/vitest.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

Create `web/src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Verify the clean scaffold**

```powershell
npm run lint
npm run typecheck
npm run build
```

Expected: all three commands exit with code 0.

- [ ] **Step 6: Commit**

```powershell
git add web
git commit -m "chore(web): scaffold mimic Next.js app"
```

### Task 2: Establish Brand Tokens and Primitive Components

**Files:**
- Create: `web/src/styles/tokens.css`
- Modify: `web/src/app/globals.css`
- Create: `web/src/shared/brand/brand.ts`
- Create: `web/src/shared/brand/wordmark.tsx`
- Create: `web/src/shared/ui/pixel-button.tsx`
- Create: `web/src/shared/ui/pixel-panel.tsx`
- Test: `web/src/shared/ui/pixel-button.test.tsx`

- [ ] **Step 1: Write a failing primitive test**

```tsx
import { render, screen } from "@testing-library/react";
import { PixelButton } from "./pixel-button";

it("renders a semantic button with the selected emphasis", () => {
  render(<PixelButton emphasis="primary">開始使用</PixelButton>);
  expect(screen.getByRole("button", { name: "開始使用" })).toHaveAttribute(
    "data-emphasis",
    "primary",
  );
});
```

- [ ] **Step 2: Run the test and confirm failure**

```powershell
npm test -- src/shared/ui/pixel-button.test.tsx
```

Expected: FAIL because `PixelButton` does not exist.

- [ ] **Step 3: Define brand constants**

Create `web/src/shared/brand/brand.ts`:

```ts
export const brand = {
  productName: "mimic",
  characterNameZh: "咪咪庫",
  characterNameEn: "Mimiku",
  tagline: "一起存，一起花，一起在異世界探險吧!",
} as const;
```

- [ ] **Step 4: Define theme tokens**

Create `web/src/styles/tokens.css` with role-based variables:

```css
:root {
  --ink: #10152f;
  --coin: #f4bd32;
  --coin-strong: #d99518;
  --wood: #8a4f2b;
  --heart: #cf4138;
  --grass: #4f8a58;
  --sky: #6fa9d8;
  --surface: #fffaf0;
  --surface-strong: #ffffff;
  --line: #c9b890;
  --focus: #2f72d6;
  --space-1: 0.5rem;
  --space-2: 1rem;
  --space-3: 1.5rem;
  --space-4: 2rem;
  --radius-sm: 4px;
  --radius-md: 8px;
  --pixel-shadow: 4px 4px 0 var(--ink);
}
```

Import it before global rules in `web/src/app/globals.css`. Add `image-rendering: pixelated` only to `.pixel-art`, not to every image.

- [ ] **Step 5: Implement the semantic primitives**

Create `PixelButton` as a typed wrapper around native `button` and `PixelPanel` as a neutral structural container. Preserve native focus, disabled, and form semantics. Use CSS classes and `data-emphasis`; do not draw controls on canvas.

- [ ] **Step 6: Run tests and static checks**

```powershell
npm test -- src/shared/ui/pixel-button.test.tsx
npm run lint
npm run typecheck
```

Expected: PASS and no type or lint errors.

- [ ] **Step 7: Commit**

```powershell
git add web/src/styles web/src/shared web/src/app/globals.css
git commit -m "feat(web): add mimic brand tokens and UI primitives"
```

### Task 3: Produce and Integrate the Initial Mimiku Asset Set

**Files:**
- Copy: `icon.png` to `web/public/brand/mimiku-master.png`
- Create: `web/public/brand/mimiku-hero.png`
- Create: `web/public/brand/mimiku-idle.png`
- Create: `web/public/brand/mimiku-happy.png`
- Create: `web/public/brand/mimiku-thinking.png`
- Create: `web/public/brand/mimiku-reminder.png`
- Create: `web/public/brand/mimiku-serious.png`
- Create: `web/public/brand/mimiku-lost.png`
- Create: `web/public/brand/mimiku-states.png`
- Create: `web/public/brand/mimiku-model-sheet.png`
- Create: `web/public/brand/README.md`
- Test: `web/src/shared/brand/assets.test.ts`

- [ ] **Step 1: Write a failing asset contract test**

```ts
import { access } from "node:fs/promises";
import path from "node:path";

const assets = [
  "mimiku-master.png",
  "mimiku-hero.png",
  "mimiku-idle.png",
  "mimiku-happy.png",
  "mimiku-thinking.png",
  "mimiku-reminder.png",
  "mimiku-serious.png",
  "mimiku-lost.png",
  "mimiku-states.png",
  "mimiku-model-sheet.png",
];

it.each(assets)("ships %s", async (file) => {
  await expect(access(path.join(process.cwd(), "public/brand", file))).resolves.toBeUndefined();
});
```

- [ ] **Step 2: Confirm the asset test fails**

```powershell
npm test -- src/shared/brand/assets.test.ts
```

Expected: FAIL with missing files.

- [ ] **Step 3: Preserve the source reference**

```powershell
Copy-Item ..\icon.png public\brand\mimiku-master.png
```

Do not modify or delete the root `icon.png`.

- [ ] **Step 4: Generate the coherent model sheet first**

Use `icon.png` as the reference image and this invariant prompt:

```text
Create a production pixel-art model sheet for Mimiku, the mascot of the mimic shared-finance PWA. Preserve the reference treasure-chest body, offset expressive eyes, dark navy outline, warm wooden panels, gold bands, teeth, and gold heart coin. Show front three-quarter idle, happy, thinking, reminder, serious, and lost states on one flat neutral background. Use one fixed pixel grid, identical proportions and palette across every state, crisp nearest-neighbor pixels, no text, no watermark, no new costume, and no skull symbols.
```

Inspect the sheet before deriving individual states. Reject outputs with inconsistent teeth, hardware, eye count, coin design, or outline width.

- [ ] **Step 5: Export the required states, sprite sheet, and hero**

Use the approved model sheet and master reference for all six state cutouts, one evenly spaced horizontal sprite sheet, and a wide hero scene. Save with the exact paths listed above. The sprite sheet must use equal-size integer-grid frames in the order idle, happy, thinking, reminder, serious, lost. The hero must reserve readable negative space for the `mimic` wordmark and exact tagline; do not bake text into the image.

- [ ] **Step 6: Document provenance and invariants**

In `web/public/brand/README.md`, record the source file, final prompts, intended display sizes, approved palette, and rule that derivatives never replace `icon.png`.

- [ ] **Step 7: Run the asset test and inspect images**

```powershell
npm test -- src/shared/brand/assets.test.ts
```

Expected: PASS. Open every asset and confirm crisp edges, consistent character anatomy, and no embedded text.

- [ ] **Step 8: Commit**

```powershell
git add web/public/brand web/src/shared/brand/assets.test.ts
git commit -m "feat(brand): add initial Mimiku asset system"
```

### Task 4: Build the Public Layout and Home Hero

**Files:**
- Create: `web/src/app/(public)/layout.tsx`
- Create: `web/src/app/(public)/page.tsx`
- Create: `web/src/shared/brand/site-header.tsx`
- Create: `web/src/shared/brand/hero.tsx`
- Create: `web/src/shared/brand/hero.module.css`
- Test: `web/src/shared/brand/hero.test.tsx`

- [ ] **Step 1: Write the failing hero test**

```tsx
import { render, screen } from "@testing-library/react";
import { Hero } from "./hero";

it("presents the mimic identity and one primary action", () => {
  render(<Hero />);
  expect(screen.getByRole("heading", { name: "mimic" })).toBeVisible();
  expect(screen.getByText("一起存，一起花，一起在異世界探險吧!")).toBeVisible();
  expect(screen.getByRole("link", { name: "開始使用" })).toHaveAttribute("href", "/register");
  expect(screen.getByRole("img", { name: /咪咪庫/ })).toBeVisible();
});
```

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- src/shared/brand/hero.test.tsx
```

Expected: FAIL because `Hero` does not exist.

- [ ] **Step 3: Implement the public shell**

Use semantic `header`, `nav`, `main`, and `footer`. The first viewport uses Mimiku as the dominant signal, contains no card around the hero, and leaves the next section visible at 320x720, 390x844, and 1440x900.

- [ ] **Step 4: Implement responsive hero styling**

Use stable `min()`, `max-width`, `aspect-ratio`, grid, and media queries. Do not scale text with viewport width. Keep one high-emphasis CTA and preserve a readable content order when the image stacks.

- [ ] **Step 5: Run the component test and checks**

```powershell
npm test -- src/shared/brand/hero.test.tsx
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add web/src/app web/src/shared/brand
git commit -m "feat(web): add mimic public hero"
```

### Task 5: Add Public Feature, Policy, and Invitation Entry Pages

**Files:**
- Create: `web/src/app/(public)/features/page.tsx`
- Create: `web/src/app/(public)/privacy/page.tsx`
- Create: `web/src/app/(public)/terms/page.tsx`
- Create: `web/src/app/(public)/invite/[code]/page.tsx`
- Create: `web/src/shared/brand/public-copy.ts`
- Test: `web/src/app/(public)/public-pages.test.tsx`

- [ ] **Step 1: Write failing page metadata tests**

Test that each public route exports a unique title containing `mimic`, and that invitation metadata does not expose financial or membership data.

```ts
expect(featuresMetadata.title).toBe("功能 | mimic");
expect(inviteMetadata.title).toBe("加入共同冒險 | mimic");
```

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- "src/app/(public)/public-pages.test.tsx"
```

Expected: FAIL because the pages and metadata do not exist.

- [ ] **Step 3: Implement the feature page**

Describe shared funds, contributions, expense splitting, and settlement locking with real finance terminology. Pixel illustrations support the content but do not replace explanations.

- [ ] **Step 4: Implement policy shells**

Create readable privacy and terms pages marked as pre-release policy content. Do not invent legal commitments. Define `POLICY_EFFECTIVE_DATE` as the implementation date in `public-copy.ts` and render that exact value on both pages.

- [ ] **Step 5: Implement the invitation entry shell**

Validate the route code shape before rendering. Show the code only as a masked reference and direct unauthenticated users to login/register with a return URL. Do not call a nonexistent public invite-preview API in this phase.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- "src/app/(public)/public-pages.test.tsx"
npm run build
git add web/src/app web/src/shared/brand/public-copy.ts
git commit -m "feat(web): add mimic public pages"
```

Expected: tests and build pass.

### Task 6: Implement Typed NestJS API and Error Boundaries

**Files:**
- Create: `web/src/shared/api/contracts.ts`
- Create: `web/src/shared/api/errors.ts`
- Create: `web/src/shared/api/read-envelope.ts`
- Create: `web/src/shared/api/server-api.ts`
- Create: `web/src/shared/api/read-envelope.test.ts`
- Create: `web/.env.example`

- [ ] **Step 1: Write failing envelope and error tests**

```ts
expect(readEnvelope({ data: { ok: true } })).toEqual({ ok: true });
expect(() => readEnvelope({ error: "bad" })).toThrow(ApiContractError);
expect(mapApiError(401, "INVALID_CREDENTIALS").code).toBe("INVALID_CREDENTIALS");
```

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- src/shared/api/read-envelope.test.ts
```

- [ ] **Step 3: Define exact auth contracts**

```ts
export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  locale: string;
  timezone: string;
}

export interface AuthPayload {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
}
```

- [ ] **Step 4: Implement the server-only client**

Read `MIMIC_API_BASE_URL`, defaulting to `http://localhost:3000/api/v1` only in development. Use `cache: "no-store"` for authenticated calls, propagate `x-request-id`, parse the `{ data }` envelope, and return typed errors without logging tokens or passwords.

- [ ] **Step 5: Document environment values**

Create `web/.env.example`:

```dotenv
MIMIC_API_BASE_URL=http://localhost:3000/api/v1
MIMIC_COOKIE_SECURE=false
```

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/shared/api/read-envelope.test.ts
npm run typecheck
git add web/src/shared/api web/.env.example
git commit -m "feat(web): add typed NestJS API boundary"
```

### Task 7: Implement HttpOnly Session and CSRF-Protected Auth BFF

**Files:**
- Create: `web/src/shared/auth/cookies.ts`
- Create: `web/src/shared/auth/csrf.ts`
- Create: `web/src/shared/auth/session.ts`
- Create: `web/src/app/api/auth/csrf/route.ts`
- Create: `web/src/app/api/auth/login/route.ts`
- Create: `web/src/app/api/auth/register/route.ts`
- Create: `web/src/app/api/auth/logout/route.ts`
- Test: `web/src/shared/auth/csrf.test.ts`
- Test: `web/src/app/api/auth/login/route.test.ts`

- [ ] **Step 1: Write failing CSRF tests**

```ts
expect(validateCsrf("same", "same")).toBe(true);
expect(validateCsrf("one", "two")).toBe(false);
expect(validateCsrf(undefined, "two")).toBe(false);
```

- [ ] **Step 2: Write a failing login route test**

Mock the NestJS client and assert that a successful login sets `mimic_access` and `mimic_refresh` with `httpOnly: true`, while the JSON response contains the user but no tokens.

- [ ] **Step 3: Confirm failures**

```powershell
npm test -- src/shared/auth/csrf.test.ts src/app/api/auth/login/route.test.ts
```

- [ ] **Step 4: Implement cookie policy**

Use these cookie roles:

```ts
export const authCookies = {
  access: "mimic_access",
  refresh: "mimic_refresh",
  csrf: "mimic_csrf",
} as const;
```

Access and refresh cookies are HttpOnly, Secure in production, SameSite `lax`, path `/`, and use lifetimes matching 15 minutes and 30 days. The CSRF cookie is readable by the client, Secure in production, SameSite `lax`, and rotated after authentication.

- [ ] **Step 5: Implement double-submit CSRF validation**

State-changing BFF handlers require the same unpredictable token in the `mimic_csrf` cookie and `x-csrf-token` header. Compare values using a constant-time operation after checking equal byte lengths.

- [ ] **Step 6: Implement auth handlers**

Login posts `{ email, password }`; registration maps browser `displayName` to NestJS `display_name`; logout clears all three cookies and calls the existing backend logout endpoint. Never return JWTs to browser JavaScript.

- [ ] **Step 7: Verify and commit**

```powershell
npm test -- src/shared/auth/csrf.test.ts src/app/api/auth/login/route.test.ts
npm run typecheck
git add web/src/shared/auth web/src/app/api/auth
git commit -m "feat(web): add secure auth BFF"
```

### Task 8: Build Login and Registration Workflows

**Files:**
- Create: `web/src/features/auth/auth-schema.ts`
- Create: `web/src/features/auth/auth-form.tsx`
- Create: `web/src/features/auth/auth-form.module.css`
- Create: `web/src/app/(auth)/login/page.tsx`
- Create: `web/src/app/(auth)/register/page.tsx`
- Test: `web/src/features/auth/auth-form.test.tsx`

- [ ] **Step 1: Write failing form tests**

Cover invalid email, password shorter than six characters on registration, disabled duplicate submission, `INVALID_CREDENTIALS`, `EMAIL_ALREADY_REGISTERED`, and preservation of non-password fields after network failure.

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- src/features/auth/auth-form.test.tsx
```

- [ ] **Step 3: Implement Zod schemas**

```ts
export const loginSchema = z.object({
  email: z.string().email("請輸入有效的 Email"),
  password: z.string().min(1, "請輸入密碼"),
});

export const registerSchema = loginSchema.extend({
  displayName: z.string().trim().min(1, "請輸入顯示名稱"),
  password: z.string().min(6, "密碼至少需要 6 個字元"),
});
```

- [ ] **Step 4: Implement accessible forms**

Associate labels, descriptions, and errors with inputs. Fetch a CSRF token before state-changing submission, send credentials only to same-origin BFF routes, and navigate to a validated relative return URL or `/app` after success.

- [ ] **Step 5: Add restrained Mimiku feedback**

Use idle art on entry and serious art for authentication errors. Error text leads with the recovery action; character copy is secondary.

- [ ] **Step 6: Verify and commit**

```powershell
npm test -- src/features/auth/auth-form.test.tsx
npm run lint
npm run typecheck
git add web/src/features/auth web/src/app
git commit -m "feat(web): add mimic authentication screens"
```

### Task 9: Add the Protected Responsive Application Shell

**Files:**
- Create: `web/src/app/app/layout.tsx`
- Create: `web/src/app/app/page.tsx`
- Create: `web/src/shared/auth/require-session.ts`
- Create: `web/src/shared/navigation/app-navigation.tsx`
- Create: `web/src/shared/navigation/app-navigation.module.css`
- Test: `web/src/shared/navigation/app-navigation.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Assert bottom navigation at phone semantics, sidebar landmarks at desktop semantics, current-route indication, and no inaccessible icon-only labels.

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- src/shared/navigation/app-navigation.test.tsx
```

- [ ] **Step 3: Implement session protection**

Read HttpOnly cookies on the server. If access is absent, attempt one refresh through NestJS using the refresh cookie; rotate both tokens on success and redirect to `/login?returnTo=/app` on failure. Never refresh in a loop.

- [ ] **Step 4: Implement the shell**

Phone layouts use stable bottom-navigation dimensions. Desktop layouts use a side rail. The initial `/app` page clearly states that group and fund data arrive in the next plan and does not invent financial totals.

- [ ] **Step 5: Verify and commit**

```powershell
npm test -- src/shared/navigation/app-navigation.test.tsx
npm run build
git add web/src/app/app web/src/shared/auth web/src/shared/navigation
git commit -m "feat(web): add protected responsive app shell"
```

### Task 10: Add Manifest, Safe Service Worker, and Install Assets

**Files:**
- Modify: `web/next.config.ts`
- Create: `web/src/app/manifest.ts`
- Create: `web/src/app/sw.ts`
- Create: `web/src/shared/pwa/register-service-worker.tsx`
- Create: `web/src/shared/pwa/update-notice.tsx`
- Create: `web/src/app/offline/page.tsx`
- Create: `web/public/icons/icon-192.png`
- Create: `web/public/icons/icon-512.png`
- Create: `web/public/icons/icon-maskable-192.png`
- Create: `web/public/icons/icon-maskable-512.png`
- Test: `web/src/app/manifest.test.ts`

- [ ] **Step 1: Write a failing manifest test**

```ts
expect(manifest.name).toBe("mimic");
expect(manifest.short_name).toBe("mimic");
expect(manifest.display).toBe("standalone");
expect(manifest.icons).toEqual(expect.arrayContaining([
  expect.objectContaining({ sizes: "512x512" }),
]));
```

- [ ] **Step 2: Confirm failure**

```powershell
npm test -- src/app/manifest.test.ts
```

- [ ] **Step 3: Produce simplified install icons**

Derive a purpose-built Mimiku head or chest silhouette from the approved model sheet. Verify maskable safe zones at circular and rounded-square crops. Do not resize the full master illustration into these files.

- [ ] **Step 4: Implement safe caching**

Use Serwist to precache versioned static build assets, install icons, selected public pages, and `/offline`. Explicitly exclude `/api/**`, `/app/**`, authenticated HTML, and any response containing private account, group, fund, transaction, or settlement data.

- [ ] **Step 5: Implement controlled updates**

Detect a waiting worker and show a user-triggered update action. Do not activate and reload while a form is dirty. Respect `prefers-reduced-motion` in the notice.

- [ ] **Step 6: Verify manifest and production build**

```powershell
npm test -- src/app/manifest.test.ts
npm run build
```

Expected: PASS; build emits service-worker assets without caching private routes.

- [ ] **Step 7: Commit**

```powershell
git add web
git commit -m "feat(web): make mimic installable offline shell"
```

### Task 11: Apply Visible Rebrand, End-to-End Tests, and Documentation

**Files:**
- Modify: `mobile/lib/app/app.dart`
- Modify: `mobile/web/manifest.json`
- Modify: `mobile/web/index.html`
- Test: `mobile/test/app/app_test.dart` or nearest existing app title test
- Create: `web/e2e/public-and-auth.spec.ts`
- Create: `web/README.md`
- Modify: `docs/superpowers/specs/2026-07-22-pwa-core-product-design.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Write a failing Flutter visible-name test**

Add an assertion against the `MaterialApp` title:

```dart
final app = tester.widget<MaterialApp>(find.byType(MaterialApp));
expect(app.title, 'mimic');
```

If the root is `MaterialApp.router`, retrieve it with `tester.widget<MaterialApp>(find.byType(MaterialApp))`; the runtime type still exposes `title` through `MaterialApp`.

- [ ] **Step 2: Confirm the Flutter test fails**

```powershell
Set-Location mobile
flutter test test/app/app_test.dart
```

Expected: FAIL because the visible title is still PairFund.

- [ ] **Step 3: Change only user-facing Flutter brand strings**

Set the app title and web manifest values to `mimic`, and update the visible description to the approved shared-adventure positioning. Do not rename the Dart package, token storage keys, API client classes, backend package, database, or API routes.

- [ ] **Step 4: Write Playwright acceptance tests**

Cover:

```ts
test("public identity and auth entry", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "mimic" })).toBeVisible();
  await expect(page.getByText("一起存，一起花，一起在異世界探險吧!")).toBeVisible();
  await page.getByRole("link", { name: "開始使用" }).click();
  await expect(page).toHaveURL(/\/register$/);
});
```

Add viewport projects for 320x720, 390x844, and 1440x900. Assert no horizontal overflow, the next home section is partially visible, protected `/app` redirects without a session, and private API responses are absent from Cache Storage.

- [ ] **Step 5: Run complete verification**

```powershell
Set-Location web
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
Set-Location ..\mobile
flutter test
```

Expected: every command exits with code 0.

- [ ] **Step 6: Perform visual and PWA verification**

Use Playwright screenshots at all three required viewports. Confirm crisp integer-scaled Mimiku art, no text overlap, no clipped controls, visible focus, reduced-motion fallback, valid install metadata, and no private route caching. Run Lighthouse against a production build and record PWA, accessibility, SEO, and performance findings in `web/README.md` without inventing scores.

- [ ] **Step 7: Update current documentation and devlog**

Add a short note at the top of the PWA core design stating that the user-facing product is now mimic and linking to the brand spec. Append a factual `.agents/devlog.md` entry listing the web foundation, brand assets, visible Flutter rename, commands run, and any remaining browser-specific gaps.

- [ ] **Step 8: Commit**

```powershell
git add mobile web docs/superpowers/specs/2026-07-22-pwa-core-product-design.md .agents/devlog.md
git commit -m "feat: establish mimic PWA foundation"
```

## Final Acceptance

Before starting the groups-and-funds plan, verify all of the following:

- Public routes render indexable mimic metadata and the approved exact tagline.
- Mimiku assets follow one approved model sheet and remain crisp at supported sizes.
- Login and registration keep JWTs out of browser JavaScript and `localStorage`.
- State-changing BFF routes reject absent or mismatched CSRF tokens.
- `/app` is protected and responsive, without invented financial data.
- The service worker caches only static/public resources and never caches private financial responses.
- Flutter shows mimic to users while preserving internal PairFund identifiers.
- The original root `icon.png` remains byte-for-byte unchanged.
- Web lint, typecheck, unit tests, production build, Playwright tests, and Flutter tests pass.
