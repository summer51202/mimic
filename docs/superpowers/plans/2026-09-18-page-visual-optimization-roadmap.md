# Page Visual Optimization Implementation Roadmap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each separately approved phase. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the approved Mimic pixel-fantasy page visual system in independently reviewable phases while preserving exact financial behavior, privacy, and the immutability of settled periods.

**Architecture:** Keep live financial truth in semantic HTML and treat art as progressive enhancement. Complete the asset approval gate first, then build shared visual and deterministic-test foundations, and only then redesign bounded route families. Promote an approved asset into `web/public/` and the runtime registry only in the phase that adds its named non-test consumer.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, CSS Modules/global design tokens, Vitest/Testing Library, Playwright, PNGJS, Serwist, existing NestJS/PostgreSQL real-backend acceptance

---

## Planning authority and baseline

- Repository baseline: `main` at `a157a83` (`docs: define page visual optimization design`).
- Approved requirements:
  - `docs/superpowers/specs/2026-09-14-visual-asset-hierarchy-design.md`
  - `docs/superpowers/specs/2026-09-14-page-visual-optimization-design.md`
- Runtime palette authority: `web/src/styles/tokens.css`.
- Asset catalogue authority: `docs/design/visual-assets.md`.
- Runtime asset entry point: `web/src/shared/brand/pixel-ui-assets.ts`.
- Immutable master: repository-root `icon.png`, current SHA-256 `f69a20b714799566fbe21734419e7480655c37f6417cbd224c1e240b448c40ac`.
- Existing financial behavior authority remains the financial-space specifications and real-backend suites. This roadmap does not authorize API, accounting, authorization, privacy, or settlement-lock changes.
- The page-visual specification header still says “Draft for user review,” while this planning request explicitly declares the design approved. The direct approval governs this roadmap; the specification file is not rewritten by this planning change.
- The page-visual specification says that it does not itself authorize implementation planning. This direct request supplies that authorization and only that authorization. It does not authorize implementation, a worktree, or image generation in this session.

## Repository reconciliation

| Area | Repository evidence | Status against approved design | Gap carried by roadmap |
|---|---|---|---|
| Asset hierarchy | `docs/design/visual-assets.md`, `web/src/shared/brand/pixel-ui-assets.ts`, source/runtime/legacy directories, asset boundary tests | Implemented | Keep as a hard boundary; do not redo migration |
| Existing image integrity | Six 512px character states, four 96px avatars, two deferred treasury scenes, one deferred frame, four PWA icons; 65 focused asset tests pass | Implemented for the old/current surface | These files are not implicit approval for the new page redesign |
| Asset review process | No consumer-complete phase-1 manifest, family calibration board, approval record, or production-ready page-visual family | Missing | Phase 1 |
| Tokens and primitives | `tokens.css`, `globals.css`, `PixelButton`, `PixelField`, `PixelDialog`, `PixelFrame`, `PixelNotice`, `AppRouteState` | Partial | Undefined token references, typography, shared state/dialogue/motion contracts, and contrast/focus matrix remain |
| Public routes | Landing, Features, Privacy, Terms, Login, Register, and Invite routes exist | Functional, visually partial | No cave viewport, chapters, legal reading treatment, guild-auth composition, or recruitment-notice composition |
| App IA and shell | Five links exist and phone bottom navigation exists | Partial and structurally different | Labels/routes do not match approved IA; desktop is a left rail rather than a thin top rail; Adventure Log route is absent |
| Home and quick expense | Actor-scoped home cards, tasks, context selection, and quick expense routing exist | Functional, visually divergent | Home is a dashboard-card grid rather than the approved secret-base composition; quick expense is not the approved drawer/sheet notebook |
| Guild and management | Group list/detail, create/join/invite, members, rename/leave/archive, settings exist | Functional, partial | Recruitment-board/registry views, party formation, centralized adventure wizard/history, avatar selection, role changes, and member removal are absent |
| Personal mode | Exact monthly totals, records, forms, taxonomy, shared references, drafts, offline handling exist | Functional, visually partial | No period-first backpack/rhythm hierarchy, ledger/timeline toggle, month/weekly journal adaptation, or deeper-analysis separation |
| Shared mode | Exact positions, expense CRUD, settlement, confirmation, corrections, lock and lifecycle flows exist | Functional, visually partial | No chronological mixed-event ledger, payer/participant formation, balance roster, mission-board settlement composition, or completed-adventure treatment |
| Pooled mode | Available/book/pending balances, activity facts, occurrences, reimbursements, shortfalls, returns, closing exist | Functional, visually partial | No approved overview priority, typed activity rows, contribution progress composition, or persistent closing stages |
| Responsive regression | Playwright projects exist at 320, 390, 768, and 1440; real-backend financial suites cover all four | Implemented baseline | Preserve these suites in every affected phase |
| Visual regression | Playwright writes ad-hoc output screenshots | Partial | No committed deterministic baselines, seeded dialogue/clock/font readiness, focus/reduced-motion/long-content matrix, or screenshot review policy |
| Asset failure | Live content generally survives because art is secondary | Partial | No systematic broken-image/fallback acceptance for scenes, characters, icons, and wordmark |

No requirement/repository contradiction blocks planning. The differences above are implementation gaps. The approved redesign adds the Adventure Log surface and changes presentation terminology, but it must continue to consume the three isolated mode projections rather than create a universal balance.

## Cross-phase invariants

Every phase must preserve all of the following:

1. Amounts, dates, names, statuses, errors, form labels, and actions remain selectable live HTML.
2. Personal, shared, and pooled facts retain separate types, components, summaries, and tests. An index may list all modes, but it may not total them together.
3. Shared positions continue to mean paid minus allocated plus completed transfers and signed corrections. A shared expense row never draws a debt arrow.
4. Completed settlement periods remain immutable; correction UI creates a later signed event and never exposes edit-in-place.
5. Pooled available, book, reimbursement, occurrence, contribution, and shortfall facts remain independently labeled.
6. Decorative asset failure cannot remove navigation, a financial fact, recovery text, or a primary action.
7. Each phase covers phone-small 320, phone 390, tablet 768, and desktop 1440.
8. Focus order follows reflowed reading order; controls meet the 44 × 44 CSS px target where isolated; states do not rely on color, animation, sound, or avatar class.
9. `prefers-reduced-motion` removes nonessential motion without hiding the resulting state.
10. `.codex-remote-attachments/` and `reference/` remain untracked, untouched, and excluded from every commit.

## Phase dependency and delivery roadmap

| Phase | Dependency | Bounded delivery | Approval point | Acceptance and rollback boundary |
|---|---|---|---|---|
| 1. Asset style gate | Existing hierarchy migration | Consumer matrix; one calibration sample for wordmark, icons, character states, avatar classes, scenes, frames, props, and motion; review record; only after approval, complete production-ready families staged outside runtime; size/alpha/contrast/motion/reduced-motion report | Approve calibration families before full-family production; approve complete families before any page composition | Review artifacts and asset families are separate commits; no route/component/CSS composition change; revert without affecting runtime |
| 2. Visual foundation and shared states | Phase 1 complete-family approval | Complete semantic tokens, typography decision, focus/touch/spacing rules, shared loading/empty/error/offline/success components, dialogue behavior, motion utilities, asset-failure wrapper, deterministic capture harness | Approve primitives and shared-state review page at four viewports | Unit/accessibility tests plus deterministic Playwright foundation baselines; no product route redesign |
| 3. Public and authentication | Phase 2; Landing/public/auth assets approved | Landing cave and chapters, Features, Privacy, Terms, Login, Register, public invite acceptance | Approve public/auth screenshots, keyboard exploration, and asset fallback before merge | Public/auth routes only; existing auth/invite flows and cache policy regressions pass |
| 4. App shell and personal base | Phase 2; Home/wordmark/dialogue assets approved | Five-destination IA, new Adventure Log route shell, desktop top rail, phone bottom nav, secret-base Home, Mimiku dialogue, recent adventure, notebook quick expense | Approve shell/Home at all viewports and both motion modes | Shell/Home/quick-expense commits remain separable; P6 real-backend navigation/task regression passes |
| 5. Guild and adventure management | Phases 2 and 4 | Guild board/registry, party detail, members/invitations, create-adventure wizard, adventure index/history completion, settings/avatar preference; existing authorization remains authoritative | Approve information architecture and governance consequence screens | Group/invite/settings unit and E2E suites; no accounting contract change |
| 6. Personal expense space | Phases 2 and 4; personal props/icons approved | Period summary, category backpack, rhythm cue, ledger/timeline toggle, month calendar and phone weekly journal, forms/taxonomy/reference treatment | Approve personal default, dense, empty, error, offline, and long-content captures | Personal unit tests and `personal-expenses.runtime.spec.ts` plus private-reference regression |
| 7. Shared expense and settlement space | Phases 2, 4, and 5; shared assets approved | User balance first, mixed chronological ledger, payer/participant formation, balance roster, settlement mission board, locks/corrections/completion treatment | Approve semantic distinction among expense, position, transfer, settlement, and correction | Shared unit suites and `shared-expenses.runtime.spec.ts`; revert does not touch backend or formulas |
| 8. Pooled fund space | Phases 2, 4, and 5; pooled assets approved | Available balance first, typed activity, current-user tasks, contribution progress, reimbursements/shortfalls/returns, persistent closing stages | Approve independent-state readability and neutral shortfall treatment | Pooled unit suites and `pooled-funds.real-backend.spec.ts`; revert does not touch backend accounting |
| 9. Cross-page integration and visual acceptance | Phases 3–8 | Full deterministic screenshot matrix, localization expansion, long names/amounts/dense lists, keyboard and 200% zoom, reduced motion, asset failure, PWA/manifest/cache, and real-backend financial regression | Final visual acceptance before release integration | Baseline-only commits separated from fixes; full Web verification and all real-backend suites pass |

## Asset promotion rule

Phase 1 production-ready files remain under `docs/design/assets/approved/page-visual-v1/`. They are not added to `web/public/`, `pixelUiFiles`, `pixelUiRoles`, the service worker, preload metadata, or a page component during Phase 1. A later page phase may promote only the exact assets it consumes, and the same commit must add:

- the non-test consumer;
- registry role and loading policy;
- fallback/live-content behavior;
- dimensions, transparency, and provenance coverage;
- deterministic screenshot coverage at the four viewports;
- updated `docs/design/visual-assets.md` rows.

This rule prevents approved-but-unused files from becoming browser-delivered payloads and preserves the completed hierarchy design.

## Deterministic visual acceptance contract

Phase 2 establishes the harness; phases 3–8 add scoped baselines; phase 9 runs the complete matrix.

- Freeze the clock and timezone to an explicit fixture instant.
- Use fixed locale, names, dates, amounts, task counts, and mode-specific fixtures.
- Replace random dialogue with a stable test pool entry.
- Wait for `document.fonts.ready`, image decode, hydration, and route data before capture.
- Disable caret blinking, toast expiry, particles, random seeds, and non-semantic idle variation.
- Capture both normal and reduced-motion states where motion exists.
- Combine `toHaveScreenshot` with structural assertions for headings, landmarks, active state, overflow, focus visibility, live financial text, and fallback actions.
- Keep screenshot thresholds strict and documented; do not raise a threshold to hide layout drift.

Required reference widths are exactly 320, 390, 768, and 1440. The existing Playwright project heights remain 568, 844, 1024, and 900 respectively unless a phase plan explicitly adds a second height for a route-specific reason.

## Regression commands retained by every affected phase

Run from `web/` unless stated otherwise:

```powershell
npm run lint
npm run typecheck
npm test
$env:MIMIC_API_BASE_URL = "http://127.0.0.1:3101/api/v1"
npm run build
npm run test:e2e -- e2e/public-and-auth.spec.ts e2e/pixel-responsive.spec.ts
```

For a phase that changes authenticated financial surfaces, run against an explicitly task-owned loopback PostgreSQL/API/Web environment, never Staging or Production:

```powershell
$env:MIMIC_RUNTIME_ACCEPTANCE = "1"
$env:MIMIC_RUNTIME_DATABASE_URL = "postgresql://mimic_test@127.0.0.1:55439/mimic_financial_spaces_test?schema=page_visual_acceptance"
$env:MIMIC_API_BASE_URL = "http://127.0.0.1:3101/api/v1"
$env:PLAYWRIGHT_BASE_URL = "http://127.0.0.1:3110"
npm run test:e2e -- e2e/navigation-home-tasks.real-backend.spec.ts e2e/personal-expenses.runtime.spec.ts e2e/real-backend-personal-references.spec.ts e2e/shared-expenses.runtime.spec.ts e2e/pooled-funds.real-backend.spec.ts
```

Before using that URL, the executor must prove that port 55439 and schema `page_visual_acceptance` belong to this task, provision them through the repository's established local acceptance workflow, and stop only task-owned processes afterward. If either is already owned by another process, stop and choose a newly documented loopback port/schema in the execution record rather than reusing or terminating it. All five specs must pass in all four configured Playwright projects. No financial response may be fulfilled or mocked.

## Roadmap deliverables and plan boundaries

- This roadmap: `docs/superpowers/plans/2026-09-18-page-visual-optimization-roadmap.md`.
- Detailed Phase 1 plan: `docs/superpowers/plans/2026-09-18-page-visual-phase-1-asset-style-gate.md`.
- Phases 2–9 each require a separate detailed implementation plan and explicit approval before execution.
- A phase plan may narrow scope further when a route family remains too large. It may not combine two numbered design phases merely for convenience.
- No plan may silently authorize a new product feature, game economy, overdue settlement state, sound, custom avatar upload, or full-scene financial-mode background.

## Roadmap acceptance checklist

- [ ] Phase boundaries match Section 2 of the approved page-visual design.
- [ ] Every phase has an independent deliverable, verification set, approval point, commit boundary, and rollback path.
- [ ] The asset gate precedes all page composition.
- [ ] Live HTML, mode isolation, settlement immutability, and pooled-state separation are explicit invariants.
- [ ] Four viewport classes, accessibility, reduced motion, deterministic visual regression, asset failure, PWA boundaries, and real-backend financial regressions are assigned to concrete phases.
- [ ] Production-ready art is staged outside `web/public/` until a named consumer is implemented.
- [ ] Existing untracked `.codex-remote-attachments/` and `reference/` are outside all file and commit scopes.
