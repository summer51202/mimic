# mimic PWA Stabilization and Delivery Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the authenticated mimic PWA a reliable staged deliverable by repairing navigation, adding a real Funds overview, handling backend outages safely, eliminating content overflow, and replacing defective pixel assets with tested clean-alpha exports.

**Architecture:** Keep the existing Next.js Server Component, same-origin BFF, and NestJS boundaries. Add typed transport errors and small route-state components, derive navigation state from the real pathname, compose the Funds overview from existing authorized group/fund reads, and use a deterministic PNG export pipeline for runtime avatars and the nine-slice frame. Regression coverage proceeds from unit/component tests to click-driven Playwright geometry and runtime-health acceptance.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod, Vitest, Testing Library, Playwright, PNGJS, CSS Modules, NestJS health API, PowerShell/WSL Docker for local acceptance.

**Design spec:** `docs/superpowers/specs/2026-08-03-mimic-pwa-stabilization-delivery-polish-design.md`

---

## File Map

- `web/src/shared/api/errors.ts`: typed upstream-unavailable error.
- `web/src/shared/api/server-api.ts`: eight-second abort signal and transport-error conversion.
- `web/src/shared/api/read-state.ts`: classify known read failures without coupling UI components to transport details.
- `web/src/shared/ui/app-route-state.tsx` and `.module.css`: reusable unavailable, forbidden, not-found, and loading presentation.
- `web/src/app/app/error.tsx`, `loading.tsx`, and `not-found.tsx`: authenticated route boundaries.
- `web/src/shared/navigation/app-section.ts`: exact/nested route matching.
- `web/src/shared/navigation/pixel-app-shell.tsx`: consume the actual pathname.
- `web/src/app/app/funds/page.tsx`: real Funds overview route.
- `web/src/features/funds/funds-overview.tsx` and `.module.css`: group-scoped fund sections and states.
- `web/scripts/export-pixel-runtime-assets.mjs`: reproducible crop, connected-background cleanup, aspect-preserving nearest-neighbor export, and frame padding.
- `web/src/shared/brand/png-inspection.ts`: test-only PNG pixel inspection helpers.
- `web/public/pixel-ui/avatar-01.png` through `avatar-04.png` and `frames-ui.png`: corrected runtime assets.
- Existing group/fund/navigation CSS modules: shrinkable tracks, bounded amounts, and stable bottom navigation.
- `web/e2e/fixtures/accounts.ts`: required backend preflight and stress-data setup.
- `web/e2e/authenticated-navigation.spec.ts`: visible-navigation regression.
- `web/e2e/authenticated-geometry.spec.ts`: frame containment and pixel-asset browser checks.
- `web/README.md`, `.agents/features.md`, `.agents/devlog.md`: runtime and delivery record.

---

### Task 1: Typed Backend Transport Failures

**Files:**
- Modify: `web/src/shared/api/errors.ts`
- Modify: `web/src/shared/api/server-api.ts`
- Modify: `web/src/shared/api/server-api.test.ts`
- Modify: `web/src/shared/api/app-route.ts`
- Modify: `web/src/shared/api/app-route.test.ts`

- [ ] **Step 1: Write failing transport regression tests**

Add focused cases to `server-api.test.ts`:

```ts
import { ApiConfigurationError, ApiError, ApiUnavailableError } from "./errors";

it("maps a rejected fetch to ApiUnavailableError without leaking TypeError", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

  await expect(requestToApi("/groups", { method: "GET" })).rejects.toMatchObject({
    code: "UPSTREAM_UNAVAILABLE",
    status: 503,
  } satisfies Partial<ApiUnavailableError>);
});

it("passes an eight-second abort signal to upstream reads", async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse({ data: [] }));

  await requestToApi("/groups", { method: "GET" });

  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
  expect(init.signal).toBeInstanceOf(AbortSignal);
});

it("does not retry a failed mutation", async () => {
  fetchMock.mockRejectedValueOnce(new TypeError("connection reset"));

  await expect(postToApi("/groups", { name: "House" })).rejects.toBeInstanceOf(
    ApiUnavailableError,
  );
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
```

Extend `app-route.test.ts` so `new ApiUnavailableError()` maps to status 503 and code `UPSTREAM_UNAVAILABLE`.

- [ ] **Step 2: Run tests and verify the red state**

Run:

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
npm test -- src/shared/api/server-api.test.ts src/shared/api/app-route.test.ts
```

Expected: FAIL because `ApiUnavailableError` does not exist, fetch has no signal, and the BFF does not preserve status 503.

- [ ] **Step 3: Add the typed error and bounded request signal**

Add to `errors.ts`:

```ts
export class ApiUnavailableError extends ApiError {
  readonly name = "ApiUnavailableError";

  constructor(message = "The API is unavailable.") {
    super(503, "UPSTREAM_UNAVAILABLE", message);
  }
}
```

In `server-api.ts`, use an eight-second default, allow only a test-specific override, and catch transport failures around `fetch`:

```ts
const defaultApiTimeoutMs = 8_000;

function apiTimeoutMs(): number {
  if (process.env.NODE_ENV === "test" && process.env.MIMIC_API_TIMEOUT_MS) {
    return Number(process.env.MIMIC_API_TIMEOUT_MS);
  }
  return defaultApiTimeoutMs;
}

async function fetchFromApi(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(apiTimeoutMs()),
    });
  } catch (error) {
    if (error instanceof ApiConfigurationError || error instanceof ApiContractError) {
      throw error;
    }
    throw new ApiUnavailableError();
  }
}
```

Call `fetchFromApi` exactly once from `requestToApi`. Import `ApiUnavailableError` in `app-route.ts` and map it before the generic branch while retaining private `no-store` headers.

- [ ] **Step 4: Run focused and API boundary tests**

Run the Step 2 command.

Expected: PASS; failed writes call `fetch` once, raw transport messages are absent, and status 503 is preserved.

- [ ] **Step 5: Commit**

```powershell
git add web/src/shared/api/errors.ts web/src/shared/api/server-api.ts web/src/shared/api/server-api.test.ts web/src/shared/api/app-route.ts web/src/shared/api/app-route.test.ts
git commit -m "fix(web): map backend transport failures"
```

---

### Task 2: Authenticated Loading and Recovery Surfaces

**Files:**
- Create: `web/src/shared/api/read-state.ts`
- Create: `web/src/shared/api/read-state.test.ts`
- Create: `web/src/shared/ui/app-route-state.tsx`
- Create: `web/src/shared/ui/app-route-state.module.css`
- Create: `web/src/shared/ui/app-route-state.test.tsx`
- Create: `web/src/shared/ui/app-read-failure.tsx`
- Create: `web/src/app/app/error.tsx`
- Create: `web/src/app/app/loading.tsx`
- Create: `web/src/app/app/not-found.tsx`
- Create: `web/src/app/app/route-boundaries.test.tsx`
- Modify: `web/src/app/app/page.tsx`
- Modify: `web/src/app/app/groups/page.tsx`
- Modify: `web/src/app/app/groups/[groupId]/page.tsx`
- Modify: `web/src/app/app/funds/[fundId]/page.tsx`

- [ ] **Step 1: Write failing state-classification and recovery tests**

Create `read-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ApiError, ApiUnavailableError } from "./errors";
import { classifyReadError } from "./read-state";

describe("classifyReadError", () => {
  it.each([
    [new ApiError(403, "GROUP_FORBIDDEN"), "forbidden"],
    [new ApiError(404, "FUND_NOT_FOUND"), "not-found"],
    [new ApiUnavailableError(), "unavailable"],
    [new Error("unexpected"), "unknown"],
  ] as const)("classifies %s as %s", (error, expected) => {
    expect(classifyReadError(error)).toBe(expected);
  });
});
```

Create component tests that assert unavailable copy, Retry callback invocation exactly once, Return to overview link, loading `role="status"`, no private identifier disclosure in the not-found state, and unknown failures falling through to the framework error boundary.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm test -- src/shared/api/read-state.test.ts src/shared/ui/app-route-state.test.tsx src/app/app/route-boundaries.test.tsx
```

Expected: FAIL because the modules and route boundaries are missing.

- [ ] **Step 3: Implement classification and shared presentation**

Use this public contract in `read-state.ts`:

```ts
export type AppReadState = "forbidden" | "not-found" | "unavailable" | "unknown";

export function classifyReadError(error: unknown): AppReadState {
  if (error instanceof ApiUnavailableError) return "unavailable";
  if (error instanceof ApiError && error.status === 403) return "forbidden";
  if (error instanceof ApiError && error.status === 404) return "not-found";
  return "unknown";
}
```

`AppRouteState` accepts `variant`, optional `onRetry`, and optional `returnHref`. It renders `PixelFrame`, the serious Mimiku asset for errors, literal recovery copy, and semantic `role="alert"` or `role="status"`. Do not include group/fund IDs in forbidden or not-found copy. `AppReadFailure` accepts an unknown error, calls `notFound()` for `not-found`, renders the forbidden or unavailable variant for those known states, and rethrows `unknown` so the framework boundary remains semantically distinct.

Wrap the awaited reads in the four listed authenticated pages with `try/catch`; return `<AppReadFailure error={error} />` from the catch. Do not catch redirects or mutation errors.

Create route files:

```tsx
// error.tsx
"use client";
export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppRouteState onRetry={reset} returnHref="/app" variant="unknown" />;
}

// loading.tsx
export default function AppLoading() {
  return <AppRouteState variant="loading" />;
}

// not-found.tsx
export default function AppNotFound() {
  return <AppRouteState returnHref="/app/groups" variant="not-found" />;
}
```

- [ ] **Step 4: Verify focused tests**

Run the Step 2 command.

Expected: PASS with one retry call and distinct state semantics.

- [ ] **Step 5: Commit**

```powershell
git add web/src/shared/api/read-state.ts web/src/shared/api/read-state.test.ts web/src/shared/ui/app-route-state.tsx web/src/shared/ui/app-route-state.module.css web/src/shared/ui/app-route-state.test.tsx web/src/shared/ui/app-read-failure.tsx web/src/app/app/error.tsx web/src/app/app/loading.tsx web/src/app/app/not-found.tsx web/src/app/app/route-boundaries.test.tsx web/src/app/app/page.tsx web/src/app/app/groups/page.tsx web/src/app/app/groups/[groupId]/page.tsx web/src/app/app/funds/[fundId]/page.tsx
git commit -m "feat(web): add authenticated recovery states"
```

---

### Task 3: Real Route-Aware Navigation

**Files:**
- Create: `web/src/shared/navigation/app-section.ts`
- Create: `web/src/shared/navigation/app-section.test.ts`
- Modify: `web/src/shared/navigation/pixel-app-shell.tsx`
- Modify: `web/src/shared/navigation/app-navigation.tsx`
- Modify: `web/src/shared/navigation/app-navigation.test.tsx`
- Modify: `web/src/shared/navigation/app-navigation.module.css`

- [ ] **Step 1: Write failing exact/nested route tests**

Create:

```ts
import { describe, expect, it } from "vitest";
import { currentAppSection } from "./app-section";

describe("currentAppSection", () => {
  it.each([
    ["/app", "/app"],
    ["/app/groups", "/app/groups"],
    ["/app/groups/g1", "/app/groups"],
    ["/app/funds", "/app/funds"],
    ["/app/funds/f1", "/app/funds"],
  ])("maps %s to %s", (pathname, section) => {
    expect(currentAppSection(pathname)).toBe(section);
  });
});
```

Update component tests so Group and Fund nested paths set `aria-current="page"` on the correct link and Overview has no `aria-current`.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm test -- src/shared/navigation/app-section.test.ts src/shared/navigation/app-navigation.test.tsx
```

Expected: FAIL because route matching is exact and the shell is hard-coded to `/app`.

- [ ] **Step 3: Implement one shared route matcher and consume `usePathname`**

`currentAppSection` checks `/app/groups` and `/app/funds` before the `/app` fallback using `pathname === base || pathname.startsWith(`${base}/`)`.

Mark `pixel-app-shell.tsx` as a Client Component, call `usePathname()`, compute the section once, and pass it to both navigation variants. Keep `children` unchanged so Server Component pages remain server-rendered.

In mobile CSS, use a column layout and stable tracks:

```css
.navigation[data-variant="mobile"] .link {
  flex-direction: column;
  min-width: 0;
  min-height: 3.75rem;
  gap: var(--mimic-space-1);
  padding: var(--mimic-space-1);
}

.navigation[data-variant="mobile"] .label {
  display: -webkit-box;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
```

- [ ] **Step 4: Run focused tests**

Run the Step 2 command.

Expected: PASS for exact and nested routes.

- [ ] **Step 5: Commit**

```powershell
git add web/src/shared/navigation/app-section.ts web/src/shared/navigation/app-section.test.ts web/src/shared/navigation/pixel-app-shell.tsx web/src/shared/navigation/app-navigation.tsx web/src/shared/navigation/app-navigation.test.tsx web/src/shared/navigation/app-navigation.module.css
git commit -m "fix(web): make app navigation route aware"
```

---

### Task 4: Real Funds Overview

**Files:**
- Create: `web/src/app/app/funds/page.tsx`
- Create: `web/src/features/funds/funds-overview.tsx`
- Create: `web/src/features/funds/funds-overview.module.css`
- Create: `web/src/features/funds/funds-overview.test.tsx`
- Modify: `web/src/features/funds/fund-queries.ts`
- Modify: `web/src/features/funds/fund-queries.test.ts`

- [ ] **Step 1: Write failing grouping and state tests**

Define the read model and test no-group, empty, mixed-currency, and partial-forbidden states:

```ts
export type GroupFundsSection = {
  group: Group;
  funds: Fund[];
  state: "ready" | "forbidden";
};

it("keeps funds grouped by owning group without a combined total", () => {
  render(<FundsOverview sections={sectionsWithTwdAndUsd} />);
  expect(screen.getByRole("heading", { name: "Home" })).toBeVisible();
  expect(screen.getByRole("heading", { name: "Trip" })).toBeVisible();
  expect(screen.queryByText(/combined total/i)).not.toBeInTheDocument();
});

it("shows a scoped create action for an empty group", () => {
  render(<FundsOverview sections={[emptySection]} />);
  expect(screen.getByRole("link", { name: "Create fund for Home" })).toHaveAttribute(
    "href",
    "/app/groups/g1/funds/new",
  );
});
```

Test `listFundsOverview()` with mocked `listGroups`/`listFunds`: it uses `Promise.allSettled`, returns sections in group order, maps only 403 to `forbidden`, and rethrows unavailable/unknown failures for the route error boundary.

- [ ] **Step 2: Run tests and verify failure**

```powershell
npm test -- src/features/funds/funds-overview.test.tsx src/features/funds/fund-queries.test.ts
```

Expected: FAIL because the overview model, component, and route do not exist.

- [ ] **Step 3: Implement the overview query and page**

Add to `fund-queries.ts`:

```ts
export async function listFundsOverview(): Promise<GroupFundsSection[]> {
  const groups = await listGroups();
  const results = await Promise.allSettled(groups.map((group) => listFunds(group.id)));

  return results.map((result, index) => {
    const group = groups[index]!;
    if (result.status === "fulfilled") return { group, funds: result.value, state: "ready" };
    if (classifyReadError(result.reason) === "forbidden") {
      return { group, funds: [], state: "forbidden" };
    }
    throw result.reason;
  });
}
```

The page calls `listFundsOverview()` and renders `FundsOverview`. The component uses `PixelFrame`, `FundLedgerCard`, group-detail and group-scoped create links, and the existing empty-group Mimiku state. Add `data-frame="funds-group"` and `data-contain-text` hooks for geometry tests.

- [ ] **Step 4: Run focused tests**

Run the Step 2 command.

Expected: PASS; no cross-currency total is rendered.

- [ ] **Step 5: Commit**

```powershell
git add web/src/app/app/funds/page.tsx web/src/features/funds/funds-overview.tsx web/src/features/funds/funds-overview.module.css web/src/features/funds/funds-overview.test.tsx web/src/features/funds/fund-queries.ts web/src/features/funds/fund-queries.test.ts
git commit -m "feat(web): add grouped funds overview"
```

---

### Task 5: Clean Pixel Asset Export Pipeline

**Files:**
- Modify: `web/package.json`
- Modify: `web/package-lock.json`
- Create: `web/scripts/export-pixel-runtime-assets.mjs`
- Create: `web/src/shared/brand/png-inspection.ts`
- Modify: `web/src/shared/brand/pixel-ui-assets.test.ts`
- Modify: `web/public/pixel-ui/avatar-01.png`
- Modify: `web/public/pixel-ui/avatar-02.png`
- Modify: `web/public/pixel-ui/avatar-03.png`
- Modify: `web/public/pixel-ui/avatar-04.png`
- Modify: `web/public/pixel-ui/frames-ui.png`
- Modify: `web/public/pixel-ui/README.md`
- Modify: `web/src/shared/ui/pixel-frame.module.css`
- Modify: `web/src/shared/ui/pixel-ui.test.tsx`

- [ ] **Step 1: Add PNGJS as a deterministic development dependency**

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
npm install --save-dev pngjs @types/pngjs
```

Expected: package files record PNGJS without changing runtime dependencies.

- [ ] **Step 2: Write failing alpha, geometry, and frame-style tests**

Add a PNG decoder helper returning width, height, and RGBA bytes. In `pixel-ui-assets.test.ts`, assert:

```ts
const rootIconSha256 = "f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac";

it.each(pixelUiAssets.avatars)("ships %s as a clean 2x RGBA avatar", async (path) => {
  const png = await inspectPng(path);
  expect([png.width, png.height]).toEqual([96, 96]);
  expect(png.hasTransparentPixel).toBe(true);
  expect(png.opaqueNeutralCheckerPixels).toBe(0);
});

it("ships a clean-alpha nine-slice frame", async () => {
  const frame = await inspectPng(pixelUiAssets.sheets.frames);
  expect([frame.width, frame.height]).toEqual([256, 166]);
  expect(frame.cornerExteriorIsTransparent).toBe(true);
  expect(frame.opaqueNeutralCheckerPixels).toBe(0);
});

it("preserves the root Mimiku master", async () => {
  expect(await sha256(path.join(process.cwd(), "..", "icon.png"))).toBe(rootIconSha256);
});
```

Update `pixel-ui.test.tsx` to require `border-image-repeat: round` and reject `border-image-repeat: stretch`.

- [ ] **Step 3: Run tests and verify current assets fail**

```powershell
npm test -- src/shared/brand/pixel-ui-assets.test.ts src/shared/ui/pixel-ui.test.tsx
```

Expected: FAIL because avatars are 128 x 128, checker pixels are opaque, and frame edges use stretch.

- [ ] **Step 4: Implement the reproducible exporter**

`export-pixel-runtime-assets.mjs` must:

1. Read `public/pixel-ui/icons-ui.png` with PNGJS.
2. Crop the four documented avatar rectangles `(85,360,170,180)`, `(255,360,170,180)`, `(430,360,170,180)`, and `(610,360,170,180)`.
3. Flood from all crop edges through connected near-neutral pixels where `max(r,g,b)-min(r,g,b) <= 12` and `min(r,g,b) >= 230`, setting only that connected background to alpha 0.
4. Find the non-transparent character bounds, resize with nearest-neighbor while preserving aspect ratio into at most 88 x 88, and center on a transparent 96 x 96 canvas. This is the exact 2x density asset for the 48 x 48 CSS slot.
5. Crop the frame `(1280,575,240,150)`, clear only connected exterior neutral pixels with the same flood rule, and center it without resampling on a transparent 256 x 166 canvas.
6. Write files atomically beside the existing runtime targets and rename them into place.

Implement explicit `crop`, `clearConnectedNeutralBackground`, `nonTransparentBounds`, `resizeContainNearest`, `centerWithoutResampling`, and `writePngAtomic` helpers. Each validates dimensions and throws before writing when a crop is out of bounds or the cleaned image is empty. `writePngAtomic` writes `<destination>.tmp`, closes the stream, then renames it over the destination. Do not modify `icon.png`.

- [ ] **Step 5: Export assets and switch the frame to tiled edges**

Add script `"assets:export": "node scripts/export-pixel-runtime-assets.mjs"`, then run:

```powershell
npm run assets:export
```

Change `border-image-repeat` to `round`, keep slice/corner sizes as whole pixels, and set avatar HTML dimensions to 48 x 48 wherever used.

- [ ] **Step 6: Verify asset tests and inspect all five corrected files**

Run the Step 3 command, then visually inspect the four avatars and frame at original resolution and in the dashboard. Expected: PASS; no checkerboard, matte, aspect distortion, or stretched edge remains.

- [ ] **Step 7: Commit**

```powershell
git add web/package.json web/package-lock.json web/scripts/export-pixel-runtime-assets.mjs web/src/shared/brand/png-inspection.ts web/src/shared/brand/pixel-ui-assets.test.ts web/public/pixel-ui/avatar-01.png web/public/pixel-ui/avatar-02.png web/public/pixel-ui/avatar-03.png web/public/pixel-ui/avatar-04.png web/public/pixel-ui/frames-ui.png web/public/pixel-ui/README.md web/src/shared/ui/pixel-frame.module.css web/src/shared/ui/pixel-ui.test.tsx
git commit -m "fix(web): replace defective pixel runtime assets"
```

---

### Task 6: Responsive Text and Amount Containment

**Files:**
- Modify: `web/src/app/globals.css`
- Modify: `web/src/shared/navigation/pixel-app-shell.module.css`
- Modify: `web/src/shared/ui/pixel-frame.module.css`
- Modify: `web/src/features/groups/treasury-dashboard.tsx`
- Modify: `web/src/features/groups/treasury-dashboard.module.css`
- Modify: `web/src/features/groups/group-list.tsx`
- Modify: `web/src/features/groups/group-management.module.css`
- Modify: `web/src/features/groups/member-roster.tsx`
- Modify: `web/src/features/funds/fund-ledger-card.tsx`
- Modify: `web/src/features/funds/fund-summary.tsx`
- Modify: `web/src/features/funds/fund-summary.module.css`
- Modify: associated component tests

- [ ] **Step 1: Add structural hooks and failing long-content component tests**

Render 255-character names, `UNBROKEN_` repeated 30 times, `-999999999999999`, and `999999999999999`. Assert user/API text uses `data-contain-text`, frames use `data-frame`, names use dedicated name classes, and amounts use dedicated amount classes. This makes geometry ownership explicit instead of testing arbitrary descendants.

- [ ] **Step 2: Run focused tests and verify failure**

```powershell
npm test -- src/features/groups/treasury-dashboard.test.tsx src/features/groups/group-actions.test.tsx src/features/funds/fund-summary.test.tsx src/features/funds/funds-overview.test.tsx
```

Expected: FAIL because containment hooks and dedicated wrappers are incomplete.

- [ ] **Step 3: Apply shrinkable-track and wrapping rules**

Use these shared rules in the owning CSS modules:

```css
.contentTrack,
.name,
.amount,
.memberMeta,
.fundLink > span {
  min-width: 0;
}

.name,
.memberMeta,
.fundLink > span {
  overflow-wrap: anywhere;
}

.amount {
  max-width: 100%;
  overflow-wrap: anywhere;
  text-align: end;
}

@media (max-width: 24rem) {
  .memberItem,
  .fundLink {
    align-items: start;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
  }

  .amount {
    grid-column: 2;
  }
}
```

Set every relevant grid track to `minmax(0, 1fr)`, use bounded amount typography, and allow panels to grow vertically. Remove `html, body { overflow-x: hidden; }` only after focused geometry E2E in Task 7 passes; use `overflow-x: clip` only on intentional artwork layers, never on the whole document.

- [ ] **Step 4: Run focused tests**

Run the Step 2 command.

Expected: PASS with explicit containment ownership.

- [ ] **Step 5: Commit**

```powershell
git add web/src/app/globals.css web/src/shared/navigation/pixel-app-shell.module.css web/src/shared/ui/pixel-frame.module.css web/src/features/groups web/src/features/funds
git commit -m "fix(web): contain long financial content"
```

---

### Task 7: Click-Driven Navigation and Geometry E2E

**Files:**
- Create: `web/e2e/authenticated-navigation.spec.ts`
- Create: `web/e2e/authenticated-geometry.spec.ts`
- Modify: `web/e2e/fixtures/accounts.ts`
- Modify: `web/e2e/groups-funds-flow.spec.ts`
- Modify: `web/e2e/pixel-responsive.spec.ts`

- [ ] **Step 1: Replace optional health checks with required preflight**

Replace `backendAvailable(): Promise<boolean>` with:

```ts
export async function requireBackend(): Promise<void> {
  const healthUrl = `${apiBaseUrl.replace(/\/+$/, "")}/health`;
  let response: Response;
  try {
    response = await fetch(healthUrl, { signal: AbortSignal.timeout(5_000) });
  } catch (error) {
    throw new Error(`Required backend is unavailable at ${healthUrl}`, { cause: error });
  }
  expect(response.ok, `Backend health failed at ${healthUrl}`).toBeTruthy();
}
```

Call it from `test.beforeAll`. Remove every `test.skip(!(await backendAvailable()))` path.

- [ ] **Step 2: Write the failing visible-navigation journey**

The test creates a group and fund through API fixtures, opens `/app`, and clicks the visible navigation links. Scope to the visible mobile or desktop navigation, assert URL and `aria-current` after Overview, Groups, nested Group, Funds, and nested Fund. Capture console errors and fail if any message contains `fetch failed`, `Runtime TypeError`, or an unexpected React/Next error.

- [ ] **Step 3: Write frame geometry and pixel rendering checks**

Add helper:

```ts
async function expectTextInsideFrames(page: Page) {
  const violations = await page.locator("[data-contain-text]").evaluateAll((nodes) =>
    nodes.flatMap((node) => {
      const frame = node.closest("[data-frame]");
      if (!frame) return [`${node.textContent}: missing frame`];
      const text = node.getBoundingClientRect();
      const box = frame.getBoundingClientRect();
      const tolerance = 1;
      return text.left >= box.left - tolerance &&
        text.right <= box.right + tolerance &&
        text.top >= box.top - tolerance &&
        text.bottom <= box.bottom + tolerance
        ? []
        : [String(node.textContent)];
    }),
  );
  expect(violations).toEqual([]);
}
```

The test visits Overview, Groups, Group detail, Funds overview, and Fund detail with stress data at all configured projects. Assert avatar natural/rendered dimensions, `image-rendering`, whole-pixel frame rectangles, no document overflow, and no visible checker-pattern asset pixels in screenshots.

- [ ] **Step 4: Run E2E and verify failures before final CSS/test-hook completion**

```powershell
npm run test:e2e -- e2e/authenticated-navigation.spec.ts e2e/authenticated-geometry.spec.ts
```

Expected before completing Tasks 3-6: failures identify missing Funds route, wrong active state, checker assets, or frame containment.

- [ ] **Step 5: Complete the minimal hook/layout adjustments and rerun**

Do not weaken tolerance or hide overflow globally. Correct the owning component or CSS rule for every violation, rerunning the two focused specs until all four Playwright projects pass.

- [ ] **Step 6: Commit**

```powershell
git add web/e2e/fixtures/accounts.ts web/e2e/groups-funds-flow.spec.ts web/e2e/pixel-responsive.spec.ts web/e2e/authenticated-navigation.spec.ts web/e2e/authenticated-geometry.spec.ts web/src
git commit -m "test(web): lock authenticated delivery regressions"
```

---

### Task 8: Deterministic Local Runtime Acceptance

**Files:**
- Create: `web/scripts/verify-local-runtime.mjs`
- Modify: `web/package.json`
- Modify: `web/README.md`
- Modify: `web/playwright.config.ts`

- [ ] **Step 1: Add a failing runtime verifier test mode**

Implement script arguments `--health-only` and `--base-url`. The script checks health three times: before browser tests, after authentication setup, and after Groups/Funds navigation. Each failure prints the exact URL and exits nonzero. It also prints the configured Web and API roots without printing tokens or cookies.

- [ ] **Step 2: Add the runtime script and same-revision guard**

Add package script:

```json
"verify:runtime": "node scripts/verify-local-runtime.mjs --base-url http://localhost:3001/api/v1"
```

The script optionally accepts `MIMIC_BACKEND_REVISION`; when set, compare it with the expected revision supplied by the acceptance command and fail on mismatch. Document that the existing `pairfund-backend` bind mount points at `D:\Project\mimic\backend`, while the PWA worktree is separate, and provide one authoritative workflow:

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation
wsl --exec docker start pairfund-postgres
cd backend
npm run build
$env:PORT='3001'
npm run start:dev
```

Run Web separately from `web/` on 3010 with `.env.local` targeting 3001. Do not present the drifting prebuilt `pairfund-backend` container as the acceptance backend.

- [ ] **Step 3: Verify health and documentation commands**

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
npm run verify:runtime
```

Expected: PASS only while the same-worktree backend remains healthy; stopping it makes the command fail with the health URL.

- [ ] **Step 4: Commit**

```powershell
git add web/scripts/verify-local-runtime.mjs web/package.json web/package-lock.json web/README.md web/playwright.config.ts
git commit -m "docs(web): make local acceptance deterministic"
```

---

### Task 9: Final Verification, Feature Map, and Delivery Record

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Modify: `docs/superpowers/specs/2026-08-03-mimic-pwa-stabilization-delivery-polish-design.md`
- Modify: `web/README.md`

- [ ] **Step 1: Run static and component verification**

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation\web
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: all commands exit 0; Vitest includes transport, recovery, navigation, Funds overview, asset integrity, and long-content regressions.

- [ ] **Step 2: Run required backend and E2E verification**

With the same-worktree backend on 3001:

```powershell
npm run verify:runtime
npm run test:e2e
npm run verify:runtime
```

Expected: all four projects pass; no backend-backed test is skipped; health passes before and after; no unexpected console errors.

- [ ] **Step 3: Perform visual review**

Inspect authenticated screenshots for Overview, Groups, Group detail, Funds overview, and Fund detail at 320 x 720, 390 x 844, 768 x 1024, and 1440 x 900. Reject any text outside its frame, checker grid, matte, halo, blurred avatar, stretched edge, fractional frame placement, overlap, or incorrect active navigation.

- [ ] **Step 4: Update project records**

Mark PWA stabilization and Funds overview done in `.agents/features.md`. Append a factual devlog entry listing all touched modules, tests, runtime decisions, verification counts, and any remaining browser-vendor install gaps. Add a Delivery Record to the design spec and update README verification output.

- [ ] **Step 5: Run repository hygiene checks**

```powershell
cd D:\Project\mimic\.worktrees\mimic-pwa-foundation
git diff --check
git status --short
```

Expected: no whitespace errors and only intended documentation changes remain before the final commit.

- [ ] **Step 6: Commit**

```powershell
git add .agents/features.md .agents/devlog.md docs/superpowers/specs/2026-08-03-mimic-pwa-stabilization-delivery-polish-design.md web/README.md
git commit -m "docs: record mimic PWA stabilization delivery"
```

---

## Final Acceptance Checklist

- [ ] `/app/funds` is a real grouped Funds overview.
- [ ] Overview, Groups, and Funds active state follows exact and nested routes.
- [ ] Backend connection failures render a recoverable mimic state, never raw `fetch failed` UI.
- [ ] Loading, forbidden, not-found, unavailable, and unknown states remain distinct.
- [ ] Mobile navigation labels remain within stable cells at 320 px.
- [ ] Long names and large signed amounts remain inside their owning frames.
- [ ] Avatar and frame PNGs contain clean alpha and no opaque checker grid.
- [ ] Avatars preserve aspect ratio in 96 x 96 2x assets rendered at 48 x 48 CSS px; frame edges tile instead of stretch.
- [ ] Required E2E fails rather than skips when backend health fails.
- [ ] Visible navigation is clicked in E2E; direct `goto()` does not substitute for the regression journey.
- [ ] All four viewport projects pass geometry, console, and screenshot review.
- [ ] Local acceptance uses a backend from the intended revision.
- [ ] Lint, typecheck, Vitest, production build, runtime health, Playwright, and `git diff --check` pass.
