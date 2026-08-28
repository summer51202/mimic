# PairFund MVP Trial Readiness Review

Date: 2026-04-13
Scope: Mobile demo readiness, mobile remote readiness, backend gap, and next MVP trial path.

## Executive Summary

PairFund mobile is now strong enough for a clickable demo and close to being ready for first real backend integration. The mobile app has most MVP screens, session handling, remote repositories, and focused widget/repository tests. However, the product is not yet a true usable MVP because the NestJS backend, PostgreSQL persistence, real accounting logic, and mobile-to-backend integration pass are not implemented yet.

Current readiness estimate:

| Target | Readiness | Verdict |
|---|---:|---|
| Clickable mobile demo | 80-90% | Good enough for internal walkthrough |
| Mobile remote integration readiness | 75-85% | Strong, but still needs backend contract validation |
| Single-user usable MVP | 45-55% | Backend is the main missing block |
| Pair/couple beta MVP | 30-40% | Needs backend, invites, permissions, lock-rule QA |

Recommended next milestone: build a `Single-user Remote MVP` before adding more mobile surface area.

## Current Mobile Status

### Ready In Demo Mode

These flows can be demonstrated without a backend:

* login shell
* session state and startup restore behavior
* home dashboard
* fund detail
* activity timeline
* create fund
* create expense
* create correction
* create contribution
* settlement summary and complete button
* tasks / confirmations approve-reject with optional comment
* settings profile form
* logout
* navigation back behavior via `context.push(...)`

### Remote-Ready Mobile Flows

These have repository/API paths and are ready for first backend contract testing:

| Flow | Remote endpoints assumed | Status |
|---|---|---|
| Login | `POST /auth/login` | Ready |
| Refresh | `POST /auth/refresh` | Ready |
| Session restore | secure storage | Ready |
| Home | `GET /me`, `GET /groups`, `GET /groups/{groupId}/funds` | Ready |
| Fund detail | `GET /funds/{fundId}`, expenses, contributions | Ready |
| Activity | expenses, contributions, settlements | Ready |
| Create fund | `GET /groups`, `POST /groups/{groupId}/funds` | Ready |
| Create expense | `POST /funds/{fundId}/expenses` | Ready |
| Create correction | `POST /funds/{fundId}/expenses` with `expense_type=correction` | Ready |
| Create contribution | `POST /funds/{fundId}/contributions` | Ready, create-only |
| Settlement | suggestion, list, complete | Ready |
| Tasks | `GET /confirmations`, approve, reject | Ready |
| Settings | `GET /me`, `POST /me`, logout | Ready for profile; preferences static |

## What's Still Missing For A Real Trial MVP

### Backend

This is the largest blocker.

Required for Single-user Remote MVP:

* NestJS app bootstrap
* Prisma client and migrations
* PostgreSQL database
* auth register/login/refresh/logout
* `/me` read/update
* group create/list/members
* fund create/list/detail
* contribution create/list
* expense create/list
* settlement suggestion/list/complete
* confirmation list/approve/reject
* settled-period lock enforcement
* seed data for demo/testing

### Accounting Logic

Required backend services:

* money parsing and minor-unit handling
* split allocation for equal / ratio / fixed / hybrid
* rounding policy
* member position calculation
* fund balance calculation
* settlement suggestion calculation
* settlement completion and lock period enforcement
* correction transaction handling

### API Contract Validation

Mobile currently follows the v0.2 spec, but several endpoints are inferred and need real backend validation:

* `GET /funds/{fundId}` summary shape
* `/groups/{groupId}/funds` fund card shape
* settlement suggestion current settlement id behavior
* confirmation approve/reject comment payload
* settings update currently uses `POST /me` because mobile client has no `patch()` yet
* activity aggregates three endpoints instead of a dedicated activity endpoint

### Mobile Gaps That Are Acceptable For Trial

These can be deferred for early internal trial:

* contribution edit/delete/restore
* expense edit/delete/restore
* contribution list/detail separate from activity
* category management UI
* recurring rule management UI
* notification preferences
* rich member picker
* pagination and filters
* record detail page

### Mobile Gaps That Should Be Fixed Before Wider Beta

These should be addressed before couple/beta use:

* selected group state instead of first group fallback
* invite/join flow
* owner/member permission UX
* locked record detail messaging
* backend error messages mapped to user-friendly UI
* real empty states after backend data is connected
* Android/iOS device verification

## Trial Levels

### Level 1: Clickable Demo

Goal: show product flow without backend.

Status: nearly ready.

Recommended polish before showing:

* run smoke tests
* manually click through Chrome demo
* check back navigation on core child pages
* verify demo login -> home -> fund -> create record -> settings

Suggested command:

```powershell
Set-Location mobile
flutter run -d chrome --dart-define=PAIRFUND_API_MODE=demo
```

### Level 2: Single-user Remote MVP

Goal: one user can use real backend with real database.

Required work:

1. backend bootstrap
2. auth + session refresh backend
3. group/fund APIs
4. contribution/expense APIs
5. settlement APIs
6. confirmations APIs
7. seed data
8. mobile remote-mode contract pass

Suggested command after backend exists:

```powershell
Set-Location mobile
flutter run -d chrome --dart-define=PAIRFUND_API_MODE=remote --dart-define=PAIRFUND_API_BASE_URL=http://localhost:3000/api/v1
```

### Level 3: Couple Beta MVP

Goal: two people can use the app together safely.

Additional required work:

* invite/join flow
* multi-member permission checks
* multi-owner rules
* confirmation notification behavior
* settled-period lock QA
* real-device testing
* basic operational checklist

## Recommended Next Roadmap

### Phase A: Backend First Slice

Build the smallest backend slice that lets mobile remote mode log in and load home.

Deliverables:

* NestJS bootstrap
* Prisma schema migrated
* seed user/group/fund
* auth login/refresh
* `/me`
* `/groups`
* `/groups/{groupId}/funds`

Exit criteria:

* mobile remote mode can login and show Home Dashboard from real API.

### Phase B: Core Bookkeeping Slice

Deliverables:

* create contribution
* create expense
* list expenses/contributions
* fund detail summary
* activity timeline support through existing list endpoints

Exit criteria:

* mobile can create contribution and expense, then see them in fund detail/activity.

### Phase C: Settlement Slice

Deliverables:

* position calculation
* settlement suggestion
* settlement completion
* lock period enforcement
* correction transaction behavior

Exit criteria:

* mobile can complete settlement and backend blocks direct changes to settled records.

### Phase D: Confirmation Slice

Deliverables:

* confirmations list
* approve/reject with optional comment
* late/sensitive change placeholder behavior

Exit criteria:

* tasks center can read and resolve backend confirmations.

### Phase E: Trial QA

Deliverables:

* seed script
* smoke-test checklist
* manual trial script
* mobile remote-mode QA notes
* known limitations list

Exit criteria:

* one person can complete the full trial flow without editing seed data manually.

## Recommended Immediate Next Step

Start backend implementation using the existing plan:

[2026-04-06-pairfund-backend-mvp-implementation-plan.md](/d:/Project/mimic/docs/plans/2026-04-06-pairfund-backend-mvp-implementation-plan.md)

But narrow the first backend milestone to `Phase A: Backend First Slice`, not the full accounting backend. This gets us to the first real mobile/backend integration quickly and reduces contract risk early.

## Suggested First Trial Script

Once backend Phase A-C exists, use this manual script:

1. Register or login.
2. Load Home Dashboard.
3. Create a fund.
4. Open Fund Detail.
5. Add a contribution.
6. Add an expense.
7. Open Activity timeline.
8. Open Settlement.
9. Complete settlement.
10. Try adding a correction after settlement.
11. Open Tasks.
12. Approve/reject a confirmation if present.
13. Open Settings and update display name.
14. Sign out and sign back in.

## Current Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Backend shape differs from mobile assumptions | High | Implement backend Phase A early and run mobile remote-mode pass |
| Accounting logic under-specified in code | High | Use accounting implementation note and unit-test calculators first |
| `POST /me` vs `PATCH /me` mismatch | Medium | Add `patch()` to mobile client if backend requires strict REST |
| No selected-group state | Medium | Accept for single-user trial; fix before multi-group beta |
| No edit/delete/restore | Low for trial | Use correction transaction model and activity list |
| No Android SDK | Low for current demo | Use Chrome/Windows; install Android SDK before device beta |

## Bottom Line

Mobile is now ready enough to stop adding MVP surface area and begin backend integration. The fastest path to a real MVP is to build a small backend first slice, run mobile in remote mode, and fix API contract mismatches immediately.
