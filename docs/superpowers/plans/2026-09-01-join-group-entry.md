# Join Group Entry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a discoverable authenticated Join group flow that accepts a raw invitation code or complete invitation URL and hands off safely to the existing invitation confirmation page.

**Architecture:** Keep invitation parsing as a pure utility inside the invitation feature, and keep navigation/form state in a focused client component. The new authenticated page and existing Groups/Overview surfaces only compose links and components; all authoritative invitation acceptance remains in the existing `/invite/[code]` flow and Backend.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Zod 4, Vitest, Testing Library, CSS Modules.

---

## File Structure

- Create `web/src/features/invitations/invite-entry.ts` — pure parser for raw codes and complete invitation URLs.
- Create `web/src/features/invitations/invite-entry.test.ts` — table-driven parser contract tests.
- Create `web/src/features/invitations/join-group-form.tsx` — controlled manual-entry form and current-origin navigation.
- Create `web/src/features/invitations/join-group-form.test.tsx` — form validation, focus, and navigation tests.
- Create `web/src/app/app/groups/join/page.tsx` — authenticated Join group page composition.
- Modify `web/src/app/app/groups/page.tsx` — add the peer Join group action.
- Modify `web/src/app/app/route-boundaries.test.tsx` — prove the Groups and Join routes expose the intended entry points.
- Modify `web/src/features/groups/treasury-dashboard.tsx` — add Join group to the zero-group Overview state only.
- Modify `web/src/features/groups/treasury-dashboard.module.css` — lay out the paired empty-state actions responsively.
- Modify `web/src/features/groups/treasury-dashboard.test.tsx` — distinguish empty and populated Join visibility.
- Modify `web/src/features/invitations/invite-share-panel.tsx` — add Copy code with a manual selection fallback.
- Modify `web/src/features/invitations/invitation-flow.test.tsx` — prove Copy code copies only the raw 12-character code.
- Modify `.agents/features.md` — record the delivered PWA manual invitation entry.
- Modify `.agents/devlog.md` — append the required factual implementation entry.

## Task 1: Invitation Entry Parser

**Files:**
- Create: `web/src/features/invitations/invite-entry.ts`
- Create: `web/src/features/invitations/invite-entry.test.ts`

- [ ] **Step 1: Write the failing parser tests**

Create `web/src/features/invitations/invite-entry.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { parseInviteEntry } from "./invite-entry";

describe("parseInviteEntry", () => {
  it.each([
    ["abcDEF123_-4", "abcDEF123_-4"],
    ["  abcDEF123_-4  ", "abcDEF123_-4"],
    ["https://app.example/invite/abcDEF123_-4", "abcDEF123_-4"],
    ["http://localhost:3010/invite/abcDEF123_-4/", "abcDEF123_-4"],
    [
      "https://other.example/invite/abcDEF123_-4?source=message#accept",
      "abcDEF123_-4",
    ],
  ])("extracts a canonical invite code from %s", (entry, expected) => {
    expect(parseInviteEntry(entry)).toBe(expected);
  });

  it.each([
    "",
    "   ",
    "ABCD1234XYZ",
    "bad code!",
    "/invite/abcDEF123_-4",
    "mailto:abcDEF123_-4@example.com",
    "https://app.example/groups/abcDEF123_-4",
    "https://app.example/invite/abcDEF123_-4/extra",
    "not a url/invite/abcDEF123_-4",
  ])("rejects unsupported entry %s", (entry) => {
    expect(parseInviteEntry(entry)).toBeNull();
  });
});
```

- [ ] **Step 2: Run the parser test and verify RED**

Run from `web/`:

```powershell
npm test -- src/features/invitations/invite-entry.test.ts
```

Expected: FAIL because `./invite-entry` does not exist.

- [ ] **Step 3: Implement the minimal pure parser**

Create `web/src/features/invitations/invite-entry.ts`:

```ts
import { parseInviteCode } from "./invite-schema";

const invitePathPattern = /^\/invite\/([^/]+)\/?$/;

export function parseInviteEntry(value: string): string | null {
  const normalized = value.trim();
  const rawCode = parseInviteCode(normalized);

  if (rawCode) {
    return rawCode;
  }

  let url: URL;

  try {
    url = new URL(normalized);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return null;
  }

  const match = invitePathPattern.exec(url.pathname);

  if (!match) {
    return null;
  }

  try {
    return parseInviteCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the parser test and verify GREEN**

Run:

```powershell
npm test -- src/features/invitations/invite-entry.test.ts
```

Expected: PASS with all accepted and rejected table entries covered.

- [ ] **Step 5: Commit the parser slice**

```powershell
git add web/src/features/invitations/invite-entry.ts web/src/features/invitations/invite-entry.test.ts
git commit -m "feat(web): parse manual group invites"
```

## Task 2: Join Group Form and Authenticated Page

**Files:**
- Create: `web/src/features/invitations/join-group-form.tsx`
- Create: `web/src/features/invitations/join-group-form.test.tsx`
- Create: `web/src/app/app/groups/join/page.tsx`
- Modify: `web/src/app/app/route-boundaries.test.tsx`

- [ ] **Step 1: Write the failing form behavior tests**

Create `web/src/features/invitations/join-group-form.test.tsx`:

```tsx
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { JoinGroupForm } from "./join-group-form";

afterEach(() => cleanup());

describe("JoinGroupForm", () => {
  it.each([
    ["abcDEF123_-4", "/invite/abcDEF123_-4"],
    [
      "https://other.example/invite/abcDEF123_-4?source=message",
      "/invite/abcDEF123_-4",
    ],
  ])("reviews a valid invitation entered as %s", async (entry, destination) => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<JoinGroupForm onSuccess={onSuccess} />);

    await user.type(screen.getByLabelText("Invite code or link"), entry);
    await user.click(screen.getByRole("button", { name: "Review invite" }));

    expect(onSuccess).toHaveBeenCalledWith(destination);
  });

  it("keeps invalid input editable, focused, and locally explained", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(<JoinGroupForm onSuccess={onSuccess} />);
    const input = screen.getByLabelText("Invite code or link");

    await user.type(input, "not an invite");
    await user.click(screen.getByRole("button", { name: "Review invite" }));

    expect(onSuccess).not.toHaveBeenCalled();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Enter a valid 12-character invite code or invite link.",
    );
    expect(input).toHaveValue("not an invite");
  });
});
```

- [ ] **Step 2: Add a failing authenticated-page contract**

In `web/src/app/app/route-boundaries.test.tsx`, import the page:

```ts
import JoinGroupPage from "./groups/join/page";
```

Add this test inside `authenticated route boundaries`:

```tsx
it("renders the authenticated Join group entry page", () => {
  render(<JoinGroupPage />);

  expect(screen.getByRole("heading", { name: "Join group" })).toBeVisible();
  expect(screen.getByLabelText("Invite code or link")).toBeVisible();
  expect(screen.queryByText(/QR code/i)).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run both focused tests and verify RED**

Run from `web/`:

```powershell
npm test -- src/features/invitations/join-group-form.test.tsx src/app/app/route-boundaries.test.tsx
```

Expected: FAIL because the form and Join page do not exist.

- [ ] **Step 4: Implement the minimal Join form**

Create `web/src/features/invitations/join-group-form.tsx`:

```tsx
"use client";

import { type FormEvent, useRef, useState } from "react";

import { PixelButton } from "@/shared/ui/pixel-button";
import { PixelField } from "@/shared/ui/pixel-field";

import { parseInviteEntry } from "./invite-entry";
import styles from "./invitation-flow.module.css";

interface JoinGroupFormProps {
  onSuccess?: (path: string) => void;
}

const invalidInviteMessage =
  "Enter a valid 12-character invite code or invite link.";

export function JoinGroupForm({ onSuccess }: JoinGroupFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entry, setEntry] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = parseInviteEntry(entry);

    if (!code) {
      setError(invalidInviteMessage);
      inputRef.current?.focus();
      return;
    }

    setError(null);
    navigate(onSuccess, `/invite/${encodeURIComponent(code)}`);
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <PixelField
        ref={inputRef}
        autoComplete="off"
        description="Paste the 12-character code or the complete invitation link."
        error={error}
        label="Invite code or link"
        name="inviteEntry"
        onChange={(event) => setEntry(event.target.value)}
        spellCheck={false}
        value={entry}
      />
      <PixelButton type="submit">Review invite</PixelButton>
    </form>
  );
}

function navigate(
  onSuccess: JoinGroupFormProps["onSuccess"],
  path: string,
) {
  if (onSuccess) {
    onSuccess(path);
    return;
  }

  window.location.assign(path);
}
```

- [ ] **Step 5: Compose the authenticated Join page**

Create `web/src/app/app/groups/join/page.tsx`:

```tsx
import { JoinGroupForm } from "@/features/invitations/join-group-form";
import styles from "@/features/groups/group-management.module.css";
import { PixelFrame } from "@/shared/ui/pixel-frame";

export default function JoinGroupPage() {
  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <p>join an adventure party</p>
        <h1>Join group</h1>
        <p>Enter an invite code or link, then review the invitation before joining.</p>
      </header>
      <PixelFrame>
        <JoinGroupForm />
      </PixelFrame>
    </section>
  );
}
```

- [ ] **Step 6: Run both focused tests and verify GREEN**

Run:

```powershell
npm test -- src/features/invitations/join-group-form.test.tsx src/app/app/route-boundaries.test.tsx
```

Expected: PASS, including the existing authenticated route-boundary coverage.

- [ ] **Step 7: Commit the Join page slice**

```powershell
git add web/src/features/invitations/join-group-form.tsx web/src/features/invitations/join-group-form.test.tsx web/src/app/app/groups/join/page.tsx web/src/app/app/route-boundaries.test.tsx
git commit -m "feat(web): add join group page"
```

## Task 3: Groups and No-Group Entry Points

**Files:**
- Modify: `web/src/app/app/groups/page.tsx`
- Modify: `web/src/app/app/route-boundaries.test.tsx`
- Modify: `web/src/features/groups/treasury-dashboard.tsx`
- Modify: `web/src/features/groups/treasury-dashboard.module.css`
- Modify: `web/src/features/groups/treasury-dashboard.test.tsx`

- [ ] **Step 1: Extend route and dashboard tests first**

In the existing Groups success-path test in `web/src/app/app/route-boundaries.test.tsx`, add:

```tsx
expect(screen.getByRole("link", { name: "Create group" })).toHaveAttribute(
  "href",
  "/app/groups/new",
);
expect(screen.getByRole("link", { name: "Join group" })).toHaveAttribute(
  "href",
  "/app/groups/join",
);
```

In `web/src/features/groups/treasury-dashboard.test.tsx`, extend the empty-state test:

```tsx
expect(screen.getByRole("link", { name: "加入群組" })).toHaveAttribute(
  "href",
  "/app/groups/join",
);
```

Extend the populated-dashboard test:

```tsx
expect(screen.queryByRole("link", { name: "加入群組" })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```powershell
npm test -- src/app/app/route-boundaries.test.tsx src/features/groups/treasury-dashboard.test.tsx
```

Expected: FAIL because neither surface exposes the Join action yet.

- [ ] **Step 3: Add the peer Groups action**

Replace the single action in `web/src/app/app/groups/page.tsx` with the existing shared actions layout:

```tsx
<div className={styles.actions}>
  <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
    Create group
  </Link>
  <Link className="pixel-button" data-emphasis="secondary" href="/app/groups/join">
    Join group
  </Link>
</div>
```

- [ ] **Step 4: Add the paired no-group actions**

In `web/src/features/groups/treasury-dashboard.tsx`, replace the single empty-state link with:

```tsx
<div className={styles.emptyActions}>
  <Link className="pixel-button" data-emphasis="primary" href="/app/groups/new">
    建立群組
  </Link>
  <Link className="pixel-button" data-emphasis="secondary" href="/app/groups/join">
    加入群組
  </Link>
</div>
```

Add to `web/src/features/groups/treasury-dashboard.module.css`:

```css
.emptyActions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--mimic-space-3);
}
```

- [ ] **Step 5: Run the focused tests and verify GREEN**

Run:

```powershell
npm test -- src/app/app/route-boundaries.test.tsx src/features/groups/treasury-dashboard.test.tsx
```

Expected: PASS; Join is visible on Groups and the no-group Overview only.

- [ ] **Step 6: Commit the navigation slice**

```powershell
git add web/src/app/app/groups/page.tsx web/src/app/app/route-boundaries.test.tsx web/src/features/groups/treasury-dashboard.tsx web/src/features/groups/treasury-dashboard.module.css web/src/features/groups/treasury-dashboard.test.tsx
git commit -m "feat(web): expose join group entry points"
```

## Task 4: Copy the Raw Invite Code

**Files:**
- Modify: `web/src/features/invitations/invite-share-panel.tsx`
- Modify: `web/src/features/invitations/invitation-flow.test.tsx`

- [ ] **Step 1: Write the failing Copy-code assertion**

In the existing `copies the invite URL and only calls Web Share after an explicit click` test, click the new action before Copy link and assert both clipboard writes in order:

```tsx
await user.click(screen.getByRole("button", { name: "Copy code" }));
expect(writeText).toHaveBeenNthCalledWith(1, "abcDEF123_-4");

await user.click(screen.getByRole("button", { name: "Copy link" }));
expect(writeText).toHaveBeenNthCalledWith(
  2,
  "https://app.example/invite/abcDEF123_-4",
);
```

- [ ] **Step 2: Run the invitation-flow test and verify RED**

Run:

```powershell
npm test -- src/features/invitations/invitation-flow.test.tsx
```

Expected: FAIL because `Copy code` does not exist.

- [ ] **Step 3: Implement Copy code with a selection fallback**

In `web/src/features/invitations/invite-share-panel.tsx`, add a code ref:

```tsx
const codeRef = useRef<HTMLParagraphElement>(null);
```

Add the copy handler:

```tsx
async function copyInviteCode() {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(invite.invite_code);
    setNotice("Invite code copied.");
    return;
  }

  const code = codeRef.current;
  const selection = window.getSelection();

  if (code && selection) {
    const range = document.createRange();
    range.selectNodeContents(code);
    selection.removeAllRanges();
    selection.addRange(range);
    code.focus();
  }

  setNotice("Invite code selected. Copy it manually.");
}
```

Make the existing code display focusable for the fallback:

```tsx
<p className={styles.code} ref={codeRef} tabIndex={-1}>
  {invite.invite_code}
</p>
```

Add `Copy code` before the existing share actions:

```tsx
<div className={styles.shareActions}>
  <PixelButton onClick={copyInviteCode} type="button" emphasis="secondary">
    Copy code
  </PixelButton>
  <PixelButton onClick={copyInvite} type="button">
    Copy link
  </PixelButton>
  {canShare ? (
    <PixelButton onClick={shareInvite} type="button" emphasis="secondary">
      Share invite
    </PixelButton>
  ) : null}
</div>
```

- [ ] **Step 4: Run invitation-flow coverage and verify GREEN**

Run:

```powershell
npm test -- src/features/invitations/invitation-flow.test.tsx
```

Expected: PASS for code copying, link copying, native sharing, and clipboard fallback coverage.

- [ ] **Step 5: Commit the sharing slice**

```powershell
git add web/src/features/invitations/invite-share-panel.tsx web/src/features/invitations/invitation-flow.test.tsx
git commit -m "feat(web): copy group invite codes"
```

## Task 5: Documentation, Full Verification, and Review

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`

- [ ] **Step 1: Update the feature map**

Add a completed Web/PWA row to `.agents/features.md`:

```markdown
| done | pwa-join-group-entry | Open a dedicated Join group page, enter a raw invite code or complete invite link, and continue through explicit invitation confirmation | `web/src/app/app/groups/join/page.tsx`, `web/src/features/invitations/join-group-form.tsx` | `POST /group-invites/accept` through the existing confirmation flow |
```

Update the file's last-updated date to `2026-09-01` if necessary. Do not mark QR scanning, account settings, Mimic ID, or group archival complete.

- [ ] **Step 2: Append the required devlog entry**

Append to `.agents/devlog.md`:

```markdown
## 2026-09-01 — Add manual group invitation entry

**Task:** Make group invitation codes actionable through a dedicated Join group page and discoverable entry points.  
**Scope:** Web invitation parsing and form, authenticated Join route, Groups and no-group Overview actions, invitation code copying, tests, and feature map  
**What changed:**
- Added a dedicated Join group route that accepts a raw invitation code or complete invitation URL and hands off to the existing explicit acceptance page.
- Added Join group actions to the Groups page and zero-group Overview state.
- Added a Copy code action to generated invitations and regression coverage for parsing, navigation, visibility, and clipboard behavior.
**Decisions:** Kept invitation acceptance authoritative in the existing public confirmation/BFF/Backend flow; pasted external origins are discarded after extracting a valid code; QR scanning remains out of scope.  
**Known gaps / follow-ups:** Account settings with Mimic ID, safe empty-group archival, QR scanning, and native-share payload interoperability remain separate work.
```

- [ ] **Step 3: Run focused invitation and navigation tests**

Run from `web/`:

```powershell
npm test -- src/features/invitations/invite-entry.test.ts src/features/invitations/join-group-form.test.tsx src/features/invitations/invitation-flow.test.tsx src/features/groups/treasury-dashboard.test.tsx src/app/app/route-boundaries.test.tsx
```

Expected: all focused test files pass with zero failures.

- [ ] **Step 4: Run the full Web baseline**

Run from `web/`:

```powershell
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL = "http://localhost:3000/api/v1"
$env:MIMIC_COOKIE_SECURE = "false"
npm run build
```

Expected: every command exits `0`; Vitest reports zero failed tests; Next.js production build completes successfully.

- [ ] **Step 5: Run self-review and fix critical or important findings**

Use the repository `self-review` skill. Inspect `git status`, the complete diff from the implementation base, every changed file, test coverage, URL parsing security, keyboard focus, narrow-layout containment, and the unchanged authoritative acceptance boundary. Re-run affected checks after any fix until no critical or important issue remains.

- [ ] **Step 6: Commit documentation and any review fixes**

```powershell
git add .agents/features.md .agents/devlog.md
git commit -m "docs: record join group entry"
```

If self-review required a code correction after the earlier feature commits, stage only the exact corrected files and create a separate focused fix commit before this documentation commit.

- [ ] **Step 7: Verify the final tree**

Run:

```powershell
git status --short --branch
git log --oneline -6
```

Expected: only pre-existing user-owned untracked files remain; implementation and documentation commits are visible in order.
