# Join Group Entry Design

**Date:** 2026-09-01  
**Status:** Approved for implementation planning

## Goal

Make an invitation code useful without requiring recipients to receive the original clickable link. The authenticated PWA will provide a dedicated Join group page that accepts either a raw invitation code or a complete invitation URL, then hands off to the existing explicit invitation-confirmation flow.

## Scope

This slice adds:

- a `Join group` action beside `Create group` on the Groups page;
- a dedicated authenticated route at `/app/groups/join`;
- one input that accepts a raw 12-character invitation code or a complete HTTP(S) invitation URL;
- `Create group` and `Join group` actions in the no-group Overview state;
- a `Copy code` action on the invitation share panel; and
- focused parsing, navigation, empty-state, and clipboard regression coverage.

This slice does not add QR-code UI, camera access, direct acceptance from the Join page, a new Backend endpoint, group archiving, account settings, or Mimic ID support.

## User Experience

### Groups page

The Groups page keeps `Create group` as its primary action and adds a peer `Join group` action. Both actions remain available whether the user has zero, one, or several groups. `Join group` navigates to `/app/groups/join`.

### No-group Overview

When the authenticated user belongs to no active group, Overview presents both `Create group` and `Join group`. `Create group` continues to open `/app/groups/new`; `Join group` opens `/app/groups/join`.

When the user has at least one group, Overview does not add a separate Join action. The persistent entry remains on the Groups page.

### Join page

The Join page contains one visibly labelled field and one submit action. It accepts either:

- a raw, case-sensitive, 12-character URL-safe invitation code such as `abcDEF123_-4`; or
- a complete `http:` or `https:` URL whose path is `/invite/{code}`, with an optional trailing slash, query, or fragment.

Leading and trailing whitespace around the complete input is ignored. Code case is preserved. Relative paths, non-HTTP(S) schemes, URLs without an exact invitation path, malformed URLs, empty values, incorrect code lengths, and codes containing characters outside `[A-Za-z0-9_-]` are rejected beside the field.

On valid input, the PWA extracts only the code and navigates on the current origin to `/invite/{encodedCode}`. It never redirects to the origin supplied in pasted input. The existing public invitation page remains responsible for showing the invitation boundary, requiring authentication when needed, returning through the validated invitation URL, and obtaining explicit acceptance before joining the group.

### Invitation creation

The existing share result continues to show the invitation code and invitation URL. A new `Copy code` action copies exactly the 12-character code and reports success through the existing notice component. Existing `Copy link` and native `Share invite` actions remain unchanged in this slice.

## Component Boundaries

### Invitation input parser

A focused invitation utility owns normalization and parsing. It returns the validated invitation code or a typed failure suitable for an inline field message. It does not navigate, fetch, or inspect session state.

The parser reuses the canonical invitation-code schema from the existing invitation feature so creation, public-route validation, and manual entry cannot drift.

### Join form

A client component owns the input value, inline validation state, submit event, and navigation to the current-origin invitation route. It performs no API mutation because entering a code is not acceptance.

### Pages and navigation

The authenticated Join page provides the page heading and renders the Join form. The Groups page and no-group Overview link to this route using normal Next.js links. Existing app-shell authentication boundaries protect the Join page.

### Existing invitation acceptance

`/invite/[code]`, `InviteAcceptPanel`, the BFF acceptance route, and the NestJS invitation service remain authoritative and unchanged. Terminal invitation errors such as expired, already used, email mismatch, or already joined continue to be handled there.

## Error and Recovery Behavior

- Invalid local input never calls the Backend and remains editable.
- A validly formatted but unknown or expired code proceeds to the existing invitation page, which presents the authoritative Backend error.
- Pasting a URL from another origin is safe because only its validated code is retained and navigation occurs on the current origin.
- Clipboard unavailability for `Copy code` follows the existing Copy-link fallback pattern: focus/select when practical and show an actionable notice.
- The Join page does not imply that validation means membership was granted; its action is labelled to review the invitation rather than accept it.

## Accessibility and Responsive Behavior

- The invitation field has a persistent visible label and programmatically associated inline error.
- Buttons and links use the existing pixel primitives and mobile touch-target contracts.
- Validation does not rely on color alone.
- The layout is mobile-first and must not introduce horizontal scrolling for a complete invitation URL.
- Focus remains on or returns to the input when local validation fails.

## Verification

Automated coverage must prove:

- Groups renders both `Create group` and `Join group` with the correct routes;
- the no-group Overview renders both actions, while a populated dashboard does not add the empty-state Join action;
- raw codes preserve case and navigate to `/invite/{code}`;
- complete HTTP(S) invitation URLs extract the code and navigate only on the current origin;
- whitespace and an optional trailing slash, query, or fragment are handled as specified;
- empty, malformed, wrong-length, non-HTTP(S), relative-path, and wrong-path inputs show an inline error without navigation;
- the invitation share panel copies exactly the raw code through `Copy code`; and
- existing invitation creation, link sharing, public route, authentication return, and acceptance tests remain green.

Baseline Web verification remains `npm run lint`, `npm run typecheck`, `npm test`, and a production build with the repository-required environment variables.

## Follow-up Features

The following approved product needs receive separate designs and implementation plans:

1. Account and session controls, including editable display name, immutable unique Mimic ID, account information, and logout.
2. Safe archival of a single-owner empty group while preserving accounting and audit history.
3. QR-code invitation scanning after the manual code and link entry flow is proven.
