# PWA Feedback Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the treasury loading presentation, render symmetric pixel frames, and recover group-creation mutations once from expired access tokens.

**Architecture:** Keep the changes inside the existing Next.js PWA boundaries. Add a small treasury-delay helper consumed only by `/app`, replace the shared frame's asymmetric raster nine-slice with uniform CSS layers, and extend the existing refresh route plus client mutation helper with one bounded refresh-and-retry cycle.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules, Vitest, Testing Library

---

## File structure

- Create `web/src/features/groups/treasury-opening-delay.ts`: owns the 1,000 ms presentation floor.
- Create `web/src/features/groups/treasury-opening-delay.test.ts`: verifies the delay boundary with fake timers.
- Modify `web/src/app/app/page.tsx`: starts the delay with the treasury reads and awaits it before rendering any route result.
- Modify `web/src/app/app/route-boundaries.test.tsx`: isolates the delay and verifies the page invokes it.
- Modify `web/src/shared/ui/pixel-frame.module.css`: replaces raster nine-slice edges with symmetric CSS layers.
- Modify `web/src/shared/ui/pixel-ui.test.tsx`: locks the frame CSS contract.
- Modify `web/src/app/api/auth/refresh/route.ts`: adds CSRF-protected JSON refresh for client mutations while preserving GET redirects.
- Modify `web/src/app/api/auth/refresh/route.test.ts`: verifies refresh success, rejection, cookie rotation, and existing redirects.
- Modify `web/src/features/groups/group-client-api.ts`: performs one refresh and one retry after a mutation receives `401`.
- Create `web/src/features/groups/group-client-api.test.ts`: verifies the bounded retry sequence and session-expired error mapping.
- Modify `web/src/features/groups/group-form.test.tsx`: proves values survive failed recovery and group creation is not duplicated.
- Modify `.agents/devlog.md`: records the completed stabilization work.

### Task 1: Treasury loading presentation floor

**Files:**
- Create: `web/src/features/groups/treasury-opening-delay.ts`
- Create: `web/src/features/groups/treasury-opening-delay.test.ts`
- Modify: `web/src/app/app/page.tsx`
- Modify: `web/src/app/app/route-boundaries.test.tsx`

- [ ] **Step 1: Write the failing delay tests**

Create `treasury-opening-delay.test.ts` with fake timers that asserts the returned promise is pending at 999 ms and resolves at 1,000 ms:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { waitForTreasuryOpening } from "./treasury-opening-delay";

describe("waitForTreasuryOpening", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps the treasury opening state active for 1000 milliseconds", async () => {
    vi.useFakeTimers();
    let settled = false;
    const opening = waitForTreasuryOpening().then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(opening).resolves.toBeUndefined();
    expect(settled).toBe(true);
  });
});
```

In `route-boundaries.test.tsx`, extend the hoisted values and install this mock:

```ts
const { treasuryOpeningMock, /* existing mocks */ } = vi.hoisted(() => ({
  treasuryOpeningMock: vi.fn(),
  // retain every existing mock
}));

vi.mock("@/features/groups/treasury-opening-delay", () => ({
  waitForTreasuryOpening: treasuryOpeningMock,
}));
```

Reset it in `beforeEach` with `treasuryOpeningMock.mockReset().mockResolvedValue(undefined);`. Add `expect(treasuryOpeningMock).toHaveBeenCalledTimes(1);` to `keeps dashboard staged reads intact on success`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
cd web
npm test -- src/features/groups/treasury-opening-delay.test.ts src/app/app/route-boundaries.test.tsx
```

Expected: FAIL because `treasury-opening-delay.ts` does not exist and the page does not invoke the helper.

- [ ] **Step 3: Implement the minimum delay and page integration**

Create the helper:

```ts
export const treasuryOpeningMinimumMs = 1_000;

export function waitForTreasuryOpening(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, treasuryOpeningMinimumMs);
  });
}
```

In `page.tsx`, import the helper and make these exact control-flow changes:

```ts
import { waitForTreasuryOpening } from "@/features/groups/treasury-opening-delay";

export default async function AppPage({ searchParams }: AppPageProps) {
  const opening = waitForTreasuryOpening();
  // retain the current parameter, cookie, group-selection, and read setup

  try {
    groups = await listGroups();
  } catch (error) {
    await opening;
    return <AppReadFailure error={error} />;
  }

  // retain selectedGroupId calculation
  if (selectedGroupId) {
    try {
      dashboard = await getGroupDashboard(selectedGroupId);
    } catch (error) {
      await opening;
      return <AppReadFailure error={error} />;
    }
  }

  await opening;
  return (
    <TreasuryDashboard
      dashboard={dashboard}
      groups={groups}
      selectedGroupId={selectedGroupId}
    />
  );
}
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the Step 2 command.

Expected: PASS with no timer leaks or warnings.

- [ ] **Step 5: Commit the loading change**

```powershell
git add web/src/features/groups/treasury-opening-delay.ts web/src/features/groups/treasury-opening-delay.test.ts web/src/app/app/page.tsx web/src/app/app/route-boundaries.test.tsx
git commit -m "fix(web): hold treasury loading state briefly"
```

### Task 2: Symmetric shared pixel frame

**Files:**
- Modify: `web/src/shared/ui/pixel-frame.module.css`
- Modify: `web/src/shared/ui/pixel-ui.test.tsx`
- Modify: `web/e2e/authenticated-geometry.spec.ts`

- [ ] **Step 1: Write the failing CSS contract tests**

Replace the raster assertions in `pixel-ui.test.tsx` with assertions that the shared frame does not contain `border-image`, uses one uniform border declaration, and applies matching outer layers:

```ts
expect(frameCss).not.toContain("border-image");
expect(frameCss).toContain("border: 4px solid var(--mimic-color-frame-line)");
expect(frameCss).toContain("0 0 0 2px var(--mimic-color-coin-action)");
expect(frameCss).toContain("0 0 0 4px var(--mimic-color-frame-highlight)");
```

Replace `borderImageSlice` in the geometry probe with computed widths:

```ts
const style = getComputedStyle(frame);
return {
  name: frame.dataset.frame ?? frame.dataset.variant ?? frame.className,
  borderWidths: [
    style.borderTopWidth,
    style.borderRightWidth,
    style.borderBottomWidth,
    style.borderLeftWidth,
  ],
  values: [rect.x, rect.y, rect.width, rect.height],
};
```

Replace the old `borderImageSlice` assertion with:

```ts
expect(
  new Set(frame.borderWidths).size,
  `${frame.name} must use one border width on all four edges`,
).toBe(1);
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
cd web
npm test -- src/shared/ui/pixel-ui.test.tsx
```

Expected: FAIL because the current frame still uses `border-image` and a 2 px border.

- [ ] **Step 3: Implement option B with symmetric CSS layers**

Replace the raster declarations in `.frame` with:

```css
.frame {
  --pixel-frame-drop-shadow: var(--mimic-shadow-pixel-soft);
  border: 4px solid var(--mimic-color-frame-line);
  border-radius: var(--mimic-radius-panel);
  box-shadow:
    0 0 0 2px var(--mimic-color-coin-action),
    0 0 0 4px var(--mimic-color-frame-highlight),
    var(--pixel-frame-drop-shadow);
  color: var(--mimic-color-ink);
  max-width: 100%;
  min-width: 0;
  position: relative;
}
```

Keep `.frame::before` unchanged. Replace each variant's `box-shadow` declaration with the corresponding variable assignment:

```css
.treasury {
  --pixel-frame-drop-shadow: var(--mimic-shadow-stepped);
  /* retain background and padding */
}

.panel {
  --pixel-frame-drop-shadow: var(--mimic-shadow-pixel-soft);
  /* retain background and padding */
}

.dialog {
  --pixel-frame-drop-shadow: var(--mimic-shadow-stepped);
  /* retain background, max-width, and padding */
}
```

- [ ] **Step 4: Run unit and geometry tests**

Run:

```powershell
cd web
npm test -- src/shared/ui/pixel-ui.test.tsx
npm run test:e2e -- e2e/authenticated-geometry.spec.ts
```

Expected: PASS; every visible frame reports equal top, right, bottom, and left border widths.

- [ ] **Step 5: Commit the frame change**

```powershell
git add web/src/shared/ui/pixel-frame.module.css web/src/shared/ui/pixel-ui.test.tsx web/e2e/authenticated-geometry.spec.ts
git commit -m "fix(web): render symmetric pixel frames"
```

### Task 3: Programmatic session refresh route

**Files:**
- Modify: `web/src/app/api/auth/refresh/route.ts`
- Modify: `web/src/app/api/auth/refresh/route.test.ts`

- [ ] **Step 1: Write failing POST refresh tests**

Import `POST`, then add a success test that calls it with matching CSRF cookie/header and a refresh cookie:

```ts
const response = await POST(programmaticRefreshRequest());
expect(response.status).toBe(200);
await expect(response.json()).resolves.toEqual({ ok: true });
expect(response.headers.getSetCookie()).toEqual(
  expect.arrayContaining([
    expect.stringContaining(`${authCookies.access}=`),
    expect.stringContaining(`${authCookies.refresh}=`),
    expect.stringContaining(`${authCookies.csrf}=`),
  ]),
);
```

Add these helpers and cases while keeping all current GET redirect cases unchanged:

```ts
function programmaticRefreshRequest(options: {
  csrfCookie?: string;
  csrfHeader?: string;
  refreshToken?: string;
} = {}): Request {
  const csrfCookie = options.csrfCookie ?? "csrf-token";
  const csrfHeader = options.csrfHeader ?? "csrf-token";
  const refreshToken = options.refreshToken ?? "refresh-secret";
  return new Request("http://localhost/api/auth/refresh", {
    headers: {
      cookie: `${authCookies.refresh}=${refreshToken}; ${authCookies.csrf}=${csrfCookie}`,
      "x-csrf-token": csrfHeader,
    },
    method: "POST",
  });
}

it("rejects programmatic refresh with invalid CSRF", async () => {
  const response = await POST(programmaticRefreshRequest({ csrfHeader: "different" }));
  expect(response.status).toBe(403);
  expect(postToApiMock).not.toHaveBeenCalled();
});

it("rejects programmatic refresh without a refresh cookie", async () => {
  const request = new Request("http://localhost/api/auth/refresh", {
    headers: { cookie: `${authCookies.csrf}=csrf-token`, "x-csrf-token": "csrf-token" },
    method: "POST",
  });
  const response = await POST(request);
  expect(response.status).toBe(401);
});

it("clears the session when programmatic refresh fails", async () => {
  postToApiMock.mockRejectedValueOnce(new Error("refresh rejected"));
  const response = await POST(programmaticRefreshRequest());
  expect(response.status).toBe(401);
  expect(response.headers.getSetCookie()).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`${authCookies.access}=;`),
      expect.stringContaining(`${authCookies.refresh}=;`),
    ]),
  );
});
```

- [ ] **Step 2: Run the refresh route test and verify RED**

Run:

```powershell
cd web
npm test -- src/app/api/auth/refresh/route.test.ts
```

Expected: FAIL because the route exports no `POST` handler.

- [ ] **Step 3: Implement the bounded JSON refresh endpoint**

Add a `POST` handler that:

```ts
export async function POST(request: Request): Promise<NextResponse> {
  if (!hasValidCsrf(request)) {
    return csrfRejectedResponse();
  }

  const refreshToken = readCookie(request, authCookies.refresh);
  if (!refreshToken) {
    return sessionRequiredResponse();
  }

  try {
    const payload = await postToApi<AuthPayload>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    const response = NextResponse.json({ ok: true });
    setAuthSessionCookies(response, payload);
    return response;
  } catch {
    const response = sessionRequiredResponse();
    clearSessionCookies(response);
    return response;
  }
}
```

Add a private `sessionRequiredResponse()` that returns `{ error: { code: "SESSION_REQUIRED" } }` with status `401`. Reuse existing session helpers and leave GET redirect behavior intact.

```ts
function sessionRequiredResponse(): NextResponse {
  return NextResponse.json(
    { error: { code: "SESSION_REQUIRED" } },
    { status: 401 },
  );
}
```

- [ ] **Step 4: Run the refresh route test and verify GREEN**

Run the Step 2 command.

Expected: PASS for both GET and POST behavior.

- [ ] **Step 5: Commit the refresh route**

```powershell
git add web/src/app/api/auth/refresh/route.ts web/src/app/api/auth/refresh/route.test.ts
git commit -m "fix(web): support client session refresh"
```

### Task 4: Retry group mutations once after refresh

**Files:**
- Create: `web/src/features/groups/group-client-api.test.ts`
- Modify: `web/src/features/groups/group-client-api.ts`
- Modify: `web/src/features/groups/group-form.test.tsx`

- [ ] **Step 1: Write failing client retry tests**

Create `group-client-api.test.ts` with ordered fetch responses. Cover:

```ts
const mutationOptions = {
  body: JSON.stringify({ name: "Shared" }),
  method: "POST",
} as const;

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

it("refreshes once and retries the mutation once after a 401", async () => {
  fetchMock
    .mockResolvedValueOnce(Response.json({ token: "csrf-1" }))
    .mockResolvedValueOnce(Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ ok: true }))
    .mockResolvedValueOnce(Response.json({ token: "csrf-2" }))
    .mockResolvedValueOnce(Response.json({ data: { id: "group-1" } }, { status: 200 }));

  await expect(appFetch("/api/app/groups", mutationOptions)).resolves.toEqual({
    data: { id: "group-1" },
  });
  expect(fetchMock).toHaveBeenCalledTimes(5);
});
```

Add these exact assertions as separate tests using the same `fetchMock` and `mutationOptions` fixture:

```ts
expect(fetchMock).toHaveBeenCalledTimes(2); // CSRF + first successful mutation
await expect(appFetch("/api/app/groups", mutationOptions)).rejects.toMatchObject({
  status: 401,
  code: "SESSION_REQUIRED",
});
expect(fetchMock).toHaveBeenCalledTimes(3); // CSRF + mutation + failed refresh
expect(fetchMock).toHaveBeenCalledTimes(5); // CSRF + mutation + refresh + CSRF + retry
expect(groupErrorMessage(new GroupClientError(401, "SESSION_REQUIRED"))).toBe(
  "Your session expired. Sign in again, then retry.",
);
```

Extend `group-form.test.tsx` with this failed-refresh sequence:

```ts
vi.mocked(fetch)
  .mockResolvedValueOnce(Response.json({ token: "csrf-token" }))
  .mockResolvedValueOnce(
    Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }),
  )
  .mockResolvedValueOnce(
    Response.json({ error: { code: "SESSION_REQUIRED" } }, { status: 401 }),
  );

render(<GroupForm mode="create" />);
await user.type(screen.getByLabelText("Group name"), "我們的生活基金");
await user.click(screen.getByRole("button", { name: "Create group" }));

expect(await screen.findByRole("alert")).toHaveTextContent(
  "Your session expired. Sign in again, then retry.",
);
expect(screen.getByLabelText("Group name")).toHaveValue("我們的生活基金");
expect(
  vi.mocked(fetch).mock.calls.filter(([input]) => String(input) === "/api/app/groups"),
).toHaveLength(1);
```

- [ ] **Step 2: Run the client and form tests and verify RED**

Run:

```powershell
cd web
npm test -- src/features/groups/group-client-api.test.ts src/features/groups/group-form.test.tsx
```

Expected: FAIL because `appFetch` does not refresh or retry and `groupErrorMessage` has no session-expired copy.

- [ ] **Step 3: Implement one refresh and one retry**

Refactor `appFetch` into small internal helpers:

```ts
type AppFetchOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string>;
};

export async function appFetch<T>(path: string, options: AppFetchOptions): Promise<T> {
  let csrf = await fetchCsrfToken();
  let response = await sendAppRequest(path, options, csrf);

  if (response.status === 401) {
    const refresh = await fetch("/api/auth/refresh", {
      headers: { "x-csrf-token": csrf },
      method: "POST",
    });

    if (!refresh.ok) {
      throw await responseError(refresh);
    }

    csrf = await fetchCsrfToken();
    response = await sendAppRequest(path, options, csrf);
  }

  if (!response.ok) {
    throw await responseError(response);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf");
  if (!response.ok) throw await responseError(response);
  const body = (await response.json()) as { token?: unknown };
  if (typeof body.token !== "string") {
    throw new GroupClientError(502, "CSRF_TOKEN_INVALID");
  }
  return body.token;
}

function sendAppRequest(
  path: string,
  options: AppFetchOptions,
  csrf: string,
): Promise<Response> {
  return fetch(path, {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-csrf-token": csrf,
      ...options.headers,
    },
  });
}

async function responseError(response: Response): Promise<GroupClientError> {
  const body = (await response.json().catch(() => ({}))) as AppErrorBody;
  return new GroupClientError(
    response.status,
    body.error?.code ?? `HTTP_${response.status}`,
    body.error?.field,
  );
}
```

Use `sendAppRequest(path, options, csrf)` for both attempts so the same body and method are retained without recursion. Add this branch before the existing `403` branch:

```ts
if (error.status === 401) {
  return "Your session expired. Sign in again, then retry.";
}
```

- [ ] **Step 4: Run the client and form tests and verify GREEN**

Run the Step 2 command.

Expected: PASS; the retry count is bounded and form state remains intact.

- [ ] **Step 5: Commit the mutation recovery**

```powershell
git add web/src/features/groups/group-client-api.ts web/src/features/groups/group-client-api.test.ts web/src/features/groups/group-form.test.tsx
git commit -m "fix(web): recover expired group mutations"
```

### Task 5: Full verification and project record

**Files:**
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Run the Web baseline**

Run:

```powershell
cd web
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL="http://localhost:3000/api/v1"
npm run build
```

Expected: all commands exit `0`; Vitest reports no failed tests and Next.js completes a production build.

- [ ] **Step 2: Run the UI pre-delivery checks**

Read the UI skill's `references/pro-rules.md`, verify focus visibility, responsive containment, color contrast, and no horizontal overflow, then run the relevant Playwright geometry suite again if Task 2 required any adjustment.

- [ ] **Step 3: Append the required devlog entry**

Append this factual entry to `.agents/devlog.md` using the repository format:

```markdown
## 2026-09-01 — Stabilize treasury transitions, frames, and group creation

**Task:** Hold the treasury loading state briefly, make pixel frames symmetric, and recover group creation from expired access sessions.  
**Scope:** Web treasury route, shared PixelFrame CSS, auth refresh route, group client mutation helper, regression tests  
**What changed:**
- Added a 1,000 ms treasury-route presentation floor that overlaps data fetching.
- Replaced asymmetric raster nine-slice borders with uniform CSS pixel-frame layers.
- Added CSRF-protected programmatic refresh and one bounded mutation retry after `401`.
- Added route, UI contract, refresh, mutation retry, and form-state regression coverage.
**Decisions:** Limited the artificial delay to `/app`, selected scalable CSS frame option B, and kept refresh retries non-recursive to prevent duplicate mutations.  
**Known gaps / follow-ups:** Global route transitions and server-side BFF refresh remain out of scope.
```

- [ ] **Step 4: Run self-review and fix findings**

Invoke `self-review`, inspect the complete diff against the approved design, fix all critical or important findings, and rerun every affected focused test plus the baseline command that covers the fix.

- [ ] **Step 5: Commit the project record and any review fixes**

```powershell
git add .agents/devlog.md
git commit -m "docs: record PWA feedback stabilization"
```

- [ ] **Step 6: Verify repository state**

Run:

```powershell
git status --short
git log -6 --oneline
```

Expected: no uncommitted implementation or devlog changes; the task commits appear in dependency order.
