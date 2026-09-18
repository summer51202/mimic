# Mimic Page Visual Optimization Design

**Date:** 2026-09-14

**Status:** Draft for user review; individual design decisions were approved during brainstorming

**Starting point:** `main` at `333a43c`

**Scope:** Visual hierarchy, page composition, interaction presentation, responsive behavior, accessibility, asset requirements, and visual acceptance for the existing Web PWA

## 1. Goal

Redesign Mimic's public, authentication, and authenticated Web surfaces as one coherent pixel-fantasy product without changing its accounting model. The experience should recall the excitement, warmth, and nostalgia of encountering a pixel RPG for the first time while remaining a fast, trustworthy financial tool.

The central metaphor is:

- **咪咪庫 / Mimiku** is a treasure-chest monster and the user's pet bookkeeping assistant.
- A **隊伍 / Party** is a group of adventurers assembled through the **冒險者公會 / Adventurers' Guild**.
- A personal ledger, shared-expense space, or pooled fund is a finite **探險 / Adventure**.
- The user makes decisions. Mimiku helps carry out and report bookkeeping actions.

The redesign succeeds only if financial facts remain easier to understand than the decorative world surrounding them.

## 2. Scope and phase decomposition

The site is too large to design and implement safely as one visual change. It must be divided into independently reviewable phases with stable boundaries:

1. **Asset style gate** — approve the wordmark, icons, character states, avatar classes, scenes, frames, props, and motion samples before composing final pages.
2. **Visual foundation and shared states** — tokens, typography, spacing, frames, focus treatment, dialogue behavior, loading, empty, error, offline, and reduced-motion rules.
3. **Public and authentication** — Landing, Features, Privacy, Terms, Login, Register, and invite acceptance.
4. **App shell and personal base** — navigation, Home, Mimiku dialogue, recent adventure, and quick expense.
5. **Guild and adventure management** — group listing, party detail, member and invitation flows, adventure creation, adventure history, and settings.
6. **Personal expense space** — period overview, records, journal, taxonomy, forms, and personal references.
7. **Shared expense and settlement space** — shared overview, chronological ledger, positions, settlement, corrections, and completion.
8. **Pooled fund space** — overview, activity, contributions, reimbursements, shortfalls, returns, and closing.
9. **Cross-page integration and visual acceptance** — all four viewports, localization expansion, keyboard use, reduced motion, and visual-regression baselines.

Each phase may be designed and implemented independently after its required assets and preceding shared foundation are approved. This document defines the design; it is not an implementation plan.

The scope check for this specification therefore passes only as a cross-page design system. Any later implementation planning must produce a separate, bounded plan for each phase rather than one plan for the entire document.

## 3. Non-goals and invariants

This design does not authorize:

- implementation, worktree creation, or implementation planning;
- regeneration, replacement, or modification of production images before a dedicated asset review;
- changes to API contracts, accounting calculations, authorization, settlement locking, or privacy boundaries;
- a universal cross-mode balance;
- retroactive edits to completed shared periods;
- a game economy, rewards, coins, achievements, or gameplay state tied to real money;
- full scene backgrounds for personal, shared, or pooled mode pages in the first redesign;
- custom avatar uploads or a modular avatar creator in the first redesign;
- an overdue settlement state;
- continuous cursor-following character animation or mandatory Landing gameplay.

The following remain hard invariants:

- Amounts, dates, names, statuses, errors, form labels, and actions are live HTML.
- Money remains exact and mode-specific; decorative language never changes financial meaning.
- Completed shared periods remain locked. Corrections appear as new signed records in a later period.
- User decisions use direct, functional language. Mimiku's character voice is reserved for assistance, progress, and reporting.
- The root `icon.png` remains an immutable source unless a later, explicit request changes that policy.

## 4. Information architecture and terminology

### 4.1 Primary navigation

The authenticated shell has five stable destinations:

| Chinese | English | Purpose |
|---|---|---|
| 秘密基地 | Home | Personal base, recent adventure, Mimiku |
| 探險紀錄 | Adventure Log | All personal, shared, and pooled adventures |
| 冒險者公會 | Adventurers' Guild | Parties, companions, and recruitment |
| 任務中心 | Task Center | Actions that currently require this user |
| 設定 | Settings | Identity, avatar, preferences, and sign out |

Desktop uses a thin top rail with text navigation. Only entries with meaningful state may receive a small icon or badge. The rail must not become a second dashboard. Phone and phone-small use a fixed five-item bottom navigation inside the safe area.

### 4.2 Domain vocabulary

| Product concept | Chinese UI | English UI | Notes |
|---|---|---|---|
| Mimiku | 咪咪庫 | Mimiku | Chinese display name is always 咪咪庫 |
| Group | 隊伍 | Party | A persistent set of companions |
| Group owner role | 召集人 | Organizer | Avoid 隊長 / Leader; role concerns governance, not superiority |
| Financial space | 探險 | Adventure | A finite bookkeeping journey |
| Personal mode | 個人帳本 | Personal Ledger | Private expenses only |
| Shared mode | 共同分帳 | Shared Expenses | Payers, participants, positions, settlement |
| Pooled mode | 共享基金 | Pooled Fund | Common fund with independent accounting |
| Contribution | 投入 | Contribution | Prefer 投入 over 出資投入 |
| Receivable/payable position | 應收付 | Balance | Never rely on a sign or color alone |
| Settlement | 結算 | Settlement | A defined shared settlement process |
| Quick entry | 記錄支出 | Record Expense | Primary form title and submit action |

Any member may start a new shared adventure for a party. Governance-only actions remain reserved for the Organizer or the roles already enforced by the product.

### 4.3 Action language

Primary action labels state the operation directly: `記錄支出 / Record Expense`, `建立隊伍 / Create Party`, `開始探險 / Start Adventure`, `確認收到 / Confirm Receipt`.

Do not use `交給咪咪庫記下 / Ask Mimiku to Record It` as the main submit label. Mimiku may say that it is recording, calculating, checking, or has completed an action after the user has clearly chosen that action.

## 5. Shared visual system

### 5.1 Visual hierarchy

Every page uses three layers:

1. **Financial truth layer** — amounts, dates, statuses, controls, tables, form fields, and errors. This layer has the highest contrast and no decorative ambiguity.
2. **Product frame layer** — panels, parchment, wood, stone, tabs, badges, dividers, and navigation. It establishes the RPG world without obscuring information.
3. **Atmosphere layer** — scenes, characters, lighting, small particles, and idle motion. It may support focus but never carry essential meaning alone.

Only Landing and Home receive full core scenes in the initial redesign. Other pages use modular environmental components rather than a page-sized illustration.

### 5.2 Color

`web/src/styles/tokens.css` remains the runtime color authority. The redesign extends semantic roles rather than introducing page-local palettes.

The visual family uses:

- deep navy and cave charcoal for the world background;
- warm gold and amber for primary focus, firelight, and treasure hardware;
- parchment and wood for readable contained surfaces;
- restrained mint or cool blue for neutral progress and focus;
- red only for destructive or blocking states.

Light text must never sit on an insufficiently dark or busy background. Parchment surfaces use dark ink. Status is always communicated with text or an icon in addition to color.

### 5.3 Typography

- The `MIMIC` wordmark is a brand asset with an accessible text alternative and a live-text fallback.
- Display headings may use a pixel or hand-drawn fantasy face only when Traditional Chinese, Latin, numbers, and punctuation remain legible.
- Body copy, forms, tables, errors, and legal text use a highly readable UI family.
- Critical body text is at least 16 CSS px on phone. Compact metadata may be 12–14 px only when it is secondary and still passes contrast and zoom checks.
- Amounts use tabular numerals and stable alignment.
- Type size, weight, spacing, and placement carry hierarchy; uppercase, color, or pixel styling alone do not.

### 5.4 Spacing and composition

- Use an 8 px base rhythm, with 4 px allowed for tight icon and label relationships.
- Separate page title, current financial state, primary action, supporting information, and history into distinct levels.
- Dense financial rows use consistent columns and right-aligned amounts.
- Decorative frames must not reduce content padding below comfortable touch and reading space.
- Phone layouts prefer a single meaningful column over shrinking desktop grids.
- Intentional horizontal movement is permitted only inside the Landing cave viewport; the document itself must never overflow horizontally.

### 5.5 Interaction feedback

- Hover is enhancement only. Focus, pressed, selected, disabled, loading, success, and error states are visibly distinct.
- Controls have a minimum 44 × 44 CSS px touch target when isolated.
- Success animation plays once and yields immediately to the resulting state.
- Loading never replaces already-entered form data.
- Destructive and irreversible actions use the Serious state and plain-language consequences.
- Financial actions are never confirmed by animation alone.

## 6. Brand and asset system

### 6.1 Asset production gate

Before page composition begins, assets are reviewed in families:

1. one style-calibration sample per family;
2. corrected sample approval;
3. complete family production;
4. size, contrast, transparency, and reduced-motion review;
5. only then, page composition.

Approving a wireframe does not approve a generated production asset. Page layout may be adjusted after real assets are reviewed, but the information hierarchy and accounting semantics in this specification remain authoritative.

Every runtime asset must record source provenance, dimensions, intended CSS size, consumer, loading policy, and accessibility role in `docs/design/visual-assets.md`.

### 6.2 Wordmark

The brand wordmark is uppercase `MIMIC` and appears assembled from mismatched wood and metal pieces removed from a treasure-chest monster:

- each letter differs subtly in height, width, angle, board shape, wear, or hardware;
- metal edging is sparse enough that `MIMI` remains legible at distance and smaller sizes;
- the first `M` contains Mimiku's eyes within its left half, not floating above it;
- the eye pair is asymmetric, includes wooden eyebrows, and has the right eye slightly higher;
- the default pupils look gently outward without touching the eye sockets;
- the final `C` carries the mouth and heart-coin identity;
- eyes and mouth live on different letters, reinforcing that the sign was assembled from Mimiku pieces.

On Landing and Home, the wordmark may blink or glance infrequently and react once to hover or tap. It never tracks the pointer continuously. Navigation, compact logos, and install icons use static variants. Reduced motion uses the static default gaze.

### 6.3 PWA icons and favicon

- Primary PWA icon: close-up Mimiku face with eyes, teeth, heart coin, dark navy field, and gold border.
- Backup brand material: full treasure-chest character on a parchment-like field.
- 192 px and 512 px install icons retain the complete selected face and heart coin.
- 16 px and 32 px favicon variants prioritize the treasure-monster silhouette and face; omit the heart coin when it becomes illegible.
- At 48 px and above, a simplified heart coin may return if optical testing shows it clearly.
- Maskable variants preserve safe-zone visibility and do not crop eyes, teeth, or the defining chest outline.

### 6.4 Mimiku state model

| Semantic state | Current source direction | Use |
|---|---|---|
| Idle | idle-derived | Welcome, companionship, neutral empty state |
| Working | thinking-derived | Loading, calculation, organizing |
| Happy | happy-derived | Routine success |
| Reminder | reminder-derived | Pending tasks and invitations, not errors |
| Serious | serious-derived | Destructive actions, settlement locks, permissions |
| Concerned | lost-derived | Recoverable error or offline state without blaming the user |

Adventure completion is a separate celebration, not ordinary Happy.

High-value bespoke action families are:

1. record or organize a ledger;
2. deliver or recruit through an invitation;
3. count or settle;
4. move or guard pooled funds;
5. guide the next step;
6. celebrate a completed adventure.

Base states use short 2–4-frame loops. Actions normally use 4–6 frames. Celebration may be richer but must be skippable. Only one primary character animation runs on a screen at once, and no animation delays navigation, form completion, or error recovery.

### 6.5 User avatars

The first avatar set contains eight cosmetic pixel-RPG classes:

- warrior;
- mage;
- ranger;
- rogue;
- cleric;
- bard;
- alchemist;
- cartographer.

Each class provides one UI portrait and one full-body idle sprite. Full-body per-character animation is not required initially. Duplicate classes are allowed; the user's name remains the identity. Class never affects permissions, party role, financial behavior, or accounting.

After registration, the user may complete a skippable “choose your adventurer look” step. Skipping assigns a neutral default. The avatar can be changed in Settings. Custom uploads are deferred.

## 7. Mimiku dialogue system

The dialogue component resembles the familiar bottom dialogue box of a pixel RPG.

### 7.1 Behavior

- Home displays one greeting on entry.
- Short contextual messages type character by character, then briefly remain before automatically reducing or closing.
- Clicking during playback completes the current sentence immediately.
- Clicking after the full sentence appears advances or, in Home's idle state, requests another eligible line.
- Random lines are selected from contextual pools based on time, recent adventure, task state, and current page. They must not fabricate financial facts.
- Action results replace idle chatter until acknowledged or dismissed.
- Errors, offline notices, settlement confirmations, and messages containing controls do not auto-dismiss and cannot be replaced by random dialogue.

### 7.2 Accessibility

- Assistive technology receives the complete sentence without character-by-character announcements.
- Reduced motion displays the complete text immediately.
- Dialogue never steals focus merely because it appears.
- Controls inside the dialogue have an explicit focus order and are not part of the random-dialogue click target.

## 8. Public and authentication pages

### 8.1 Landing

#### Purpose

Give a first-time visitor the feeling of entering a pixel-RPG adventure with Mimiku, then explain the product clearly enough to decide whether to register.

#### First viewport

Use the approved full-screen RPG cave composition:

- the viewport is an explorable treasure cave, not a conventional hero card;
- the user avatar and Mimiku share the scene;
- firelight, bats, a harmless trap, treasure, rock layers, and hidden markings create optional discoveries;
- the bottom dialogue box holds guidance and the primary live-HTML CTA;
- the `MIMIC` wordmark is integrated into the scene but remains separately accessible;
- a quiet login or menu entry remains available.

Exploration is optional. The exit is always usable:

- unauthenticated: `開始冒險 / Start Adventure` opens the authentication choice;
- authenticated: `返回基地 / Return to Base` opens Home.

#### Interaction model

The initial interactive objects are torch, bats, pressure plate or trap, treasure, and a hidden wall drawing. Each yields a short visual response and one Mimiku line. They do not award currency, achievements, or financial effects.

The cave is a continuous horizontal environment. The initial release may contain only the central room, but both edges show passages, partial props, or light that imply continuation. Future regions attach to the same panorama.

- Desktop: drag the empty scene or use visible left/right controls.
- Phone and tablet: swipe between snap-aligned regions or use the same controls.
- Ordinary mouse-wheel behavior remains vertical page scrolling.
- Keyboard left/right movement is available while the scene has focus.
- Every interactive object is independently focusable and named.
- The CTA stays in the visible dialogue area regardless of cave position.

#### Below the fold

After the full-screen cave, use the approved **adventure-record chapters** layout. Live HTML chapters explain:

1. personal expense recording;
2. shared expenses and settlement;
3. pooled funds;
4. task handling and companion workflow.

Feature, Privacy, Terms, and footer links remain conventional, discoverable links. Cave objects may link to a section as an optional shortcut but never replace navigation.

#### Landing asset family

The asset review includes a tileable central cave and left/right interfaces, foreground rock layers, torch and lighting, bats, trap, normal treasure chest, hidden wall drawing, passage cues, Mimiku Landing actions, avatar idle sprites, and static/reduced-motion states. Text and actions remain outside image pixels.

### 8.2 Features

Features continues the adventure-record chapter language without reproducing the interactive Landing scene. Each section has one clear product capability, a small relevant prop or Mimiku state, a live heading, concise explanation, and a direct route to registration.

The three financial modes are never combined into one balance or one generic “fund” story. Examples use mode-correct language and do not imply functionality beyond the current product.

### 8.3 Privacy and Terms

Privacy and Terms prioritize long-form reading:

- restrained stone or parchment frame;
- persistent page title and table of contents where useful;
- readable line length and body type;
- normal links, headings, and focus behavior;
- no moving character beside paragraphs and no decorative texture behind body text.

Mimiku may appear once as a quiet guide at the page introduction. Legal content is never written in character voice.

### 8.4 Login and Register

Authentication uses a focused guild-reception or adventure-contract composition:

- one primary form column;
- clear field labels, password requirements, and inline errors;
- Idle Mimiku beside or above the form; Concerned or Serious only when semantically appropriate;
- register may lead to the skippable avatar-selection step;
- login and register remain recognizably authentication pages, not dialogue-driven quests.

### 8.5 Invite acceptance

An invitation appears as a readable recruitment notice containing party name, inviter, the current user's authentication state, and an explicit accept action. Reminder Mimiku may deliver the notice. Authentication redirects preserve the invitation context. Acceptance is never implicit.

## 9. App shell, Home, and quick expense

### 9.1 Home secret base

Home is the user's persistent secret base inside a dungeon cave. It is not a cave entrance and does not depict leaving through an entrance.

The approved composition uses:

- a full-width cave interior;
- a central burning campfire;
- Mimiku beside the campfire;
- a compact recent-adventure card in a corner;
- the bottom dialogue box;
- the thin top navigation rail on desktop and bottom navigation on phone.

The primary focus is the most recently active adventure. Its card shows the name, mode, current state, and user-relevant task count. `繼續探險 / Continue Adventure` opens quick expense in that context. The scene remains visually dominant; Home must not regress into a grid of dashboard cards.

If no recent adventure exists, the corner area offers a direct choice to start a personal adventure or visit the Adventurers' Guild. It must not display a fake zero balance.

### 9.2 Home dialogue

Entering Home displays one greeting. In idle mode, clicking the dialogue box after the line completes selects another contextual Mimiku message or reminder. It never changes the selected adventure or triggers a financial action.

### 9.3 Quick expense

Quick expense opens as an adventure notebook over the base:

- desktop: right-side drawer;
- phone/tablet: near-full-screen bottom sheet;
- the current or chosen adventure is preselected;
- simple cases show only the most common required fields;
- multi-payer, custom allocation, and other complex choices expand the same form into a full workspace;
- save and cancel return to the same Home context;
- success closes the form and lets Mimiku report the result;
- failure preserves input and keeps the form open.

The title and submit action remain `記錄支出 / Record Expense`.

## 10. Adventure Log, Guild, members, invitations, and settings

### 10.1 Adventure Log

Use two-column parchment dossier cards on desktop and one column on phone. Personal, shared, and pooled adventures appear in one recency-sorted index but retain mode-specific badges and one mode-appropriate primary amount. No amount is presented as a total across modes.

Provide In Progress and Completed tabs plus mode and party filters. Completed adventures look archived, not disabled.

### 10.2 Adventurers' Guild

The Guild lists every party the user created or joined. It supports two equivalent views using the same wood, parchment, typography, and status system:

- **Recruitment board** — card grid, default on desktop and tablet.
- **Party registry** — dense list, default on phone and phone-small.

The view toggle shows icon and text, exposes its pressed state, preserves sort/filter/focus, and remembers the choice on that device.

### 10.3 Party detail

Use the classic RPG party-formation layout. Each companion has a distinct portrait slot with name, stable Mimic ID where relevant, and governance role. Responsive grids become a readable list rather than tiny portraits.

The page separates:

- companions;
- adventures traveled with this party;
- start-new-adventure action, available to every active member;
- recruitment and governance actions, visible only to authorized roles.

Do not draw arbitrary relationship lines between companions.

### 10.4 Create adventure

Use a centered full-page adventure-contract wizard with three concise steps:

1. choose accounting mode;
2. choose party and companions when the mode requires them;
3. review name, currency, participation, and mode-specific starting rules.

Prior answers appear in a compact live summary. Mimiku guides and reports but does not replace form labels or direct actions.

### 10.5 Members and invitations

Member management uses portrait, name, Mimic ID, role text, and direct actions. Role and permission meaning must remain visible without opening a tooltip. Promotion, removal, leaving, and archival state their financial prerequisites and consequences before confirmation.

Invitation creation resembles a recruitment notice, but invite code, expiry, copy action, and status are live HTML. Reminder Mimiku may deliver or acknowledge it.

### 10.6 Settings

Settings groups account identity, language, avatar, motion, sound when later introduced, and session actions into separate framed sections. Display name is editable; email and Mimic ID remain clearly read-only. Avatar choice has no role or accounting implication.

## 11. Personal expense space

### 11.1 Purpose and hierarchy

The personal space first answers “How much did I spend this week or month?” Lifetime spending is secondary and available through a longer-range view, not pinned to the default overview.

The approved overview combines:

- period switcher and current period total;
- category “backpack” as the primary explanation of where money went;
- a small rhythm cue for when spending was concentrated;
- recent records and direct record-expense action.

### 11.2 Desktop and mobile composition

- Desktop/tablet: period summary and category backpack lead; the compact time rhythm supports them.
- Phone: the same order becomes one column, with categories horizontally manageable or wrapped without tiny targets.
- No mode-specific full scene is used. Frames, icons, ledger paper, bags, date stamps, and Mimiku provide theme.

### 11.3 Expense records

Provide a user-controlled view toggle:

- **Ledger list** is the default and supports rapid comparison of date, name, category, and amount.
- **Event timeline** uses restrained RPG event styling for users who prefer narrative context.

Both views use identical data, filters, search, date grouping, selection, and edit behavior. Switching views does not reset filter or scroll context unnecessarily. “Mimiku recorded” is not repeated on every row.

### 11.4 Spending journal

- Desktop/tablet default: month calendar with each day's total as live text.
- Phone/phone-small: weekly journal sequence rather than a compressed month grid.
- Selecting a day opens the expense list with the equivalent date filter.
- Chart analysis remains a deeper view, not the first visual focus.

### 11.5 Forms, taxonomy, and personal references

Forms remain standard labeled forms inside the ledger frame. Category/tag management emphasizes search, naming, merge/archive consequences, and historical continuity. Authorized shared references are visibly linked to their source, distinguish private metadata, and explain locked source facts without suggesting that the shared transaction was copied.

## 12. Shared expense and settlement space

### 12.1 Overview hierarchy

The first focus is the current user's `應收付 / Balance`. The second focus is a reverse-chronological main ledger. Supporting information follows: party positions, period facts, settlement readiness, and secondary actions.

The main ledger includes more than expenses:

- shared expenses;
- settlement creation and confirmation events;
- completed transfers;
- signed corrections;
- lifecycle events when financially relevant.

Events use explicit type labels. A settlement or correction must not look like an ordinary expense.

### 12.2 Shared expense rows

An expense row shows merchant or description, date, amount, payer, and participants. It does not repeat “your share” in the collapsed row.

Use the approved compact party formation:

- labeled payer area with payer avatar and a coin badge;
- labeled participant area with participant avatars;
- names remain available in text or accessible detail;
- no ambiguous center symbol;
- no debt arrow on an expense row.

An arrow is forbidden before settlement because paid and participated facts do not define a direct debt relationship.

### 12.3 Balance roster

Use character-roster cards for current positions. Every card says `應收` or `應付` plus an amount. Expanded calculation details may show paid, allocated, completed transfers, and corrections. Before a settlement proposal exists, the UI does not predict who should transfer to whom.

### 12.4 Settlement

Use the settlement mission-board composition:

1. the current user's required confirmation or transfer;
2. whole-party progress;
3. individual confirmed transfer cards.

Once a settlement proposal exists, arrows may represent actual payer-to-recipient transfer directions. Transfer cards retain names, avatars, amount, status, and direct confirmation action.

There is no overdue state in this design. Waiting remains factual: pending, sent, received, completed, or cancelled as supported by the domain.

Completing one settlement is not the same as completing the whole adventure. Routine settlement completion receives a concise success acknowledgement. Completing the adventure may trigger the separate, skippable celebration and then shows the immutable completed summary.

### 12.5 Locks and corrections

Locked periods display a Serious Mimiku state and plain language explaining that history cannot be edited. The only correction path creates a new signed event in a later period. Visual treatment must never imply an edit-in-place escape hatch.

## 13. Pooled fund space

### 13.1 Overview hierarchy

Use the approved status-overview layout:

1. available balance as the primary figure;
2. recent fund activity as the largest content region;
3. current user's tasks;
4. contribution plan only when enabled;
5. book balance, reimbursements, shortfall, and other calculations as labeled supporting facts.

Do not merge book balance, available balance, reimbursement, commitment, occurrence, or shortfall into one number.

### 13.2 Activity rows

Activity is chronological. Each row uses:

- event-type icon at the far left;
- compact user avatar adjacent to the person's name;
- description and state in the center;
- amount and status aligned at the right.

This keeps event type and actor visually distinct while preserving a clean amount column. Icons and color never replace the event label.

### 13.3 Contributions

Use the “my action + party progress” layout. The current user's required contribution appears first. Team progress follows without shaming or overemphasizing members who have not confirmed. Rules and previous occurrences remain lower in the hierarchy. Planned contributions do not appear in the available balance until confirmed.

### 13.4 Reimbursements, shortfalls, and returns

These appear as explicit task and activity types, not generic positive or negative expenses. The UI identifies who must act next and whether money was sent, received, or still requires confirmation. Shortfall treatment is Serious but neutral; it must not accuse a participant.

### 13.5 Closing

Use persistent stages plus a focused current-task workspace:

1. stop new activity;
2. resolve contribution occurrences;
3. complete reimbursements;
4. resolve shortfalls and returns;
5. archive the adventure.

Desktop keeps stages beside the current task. Phone uses a compact horizontal stage summary above the task. Blocked future steps state their prerequisites and cannot appear actionable.

## 14. Task Center

Task Center contains only actions assigned to the current user. It groups by priority:

1. blocking or date-passed items;
2. normal actions;
3. completed items only when the user deliberately reveals history.

Each task shows action, adventure, mode, relevant counterparty when allowed, amount or date when applicable, and one direct next action. It may use a guild-quest-board frame, but urgency comes from wording, ordering, and semantic status rather than ornamental color.

Tasks belonging to the same adventure may be separated when their urgency differs. This page answers “What should I do next?”, not “What is happening in each adventure?”

## 15. Shared loading, empty, error, offline, and success states

| State | Visual role | Required content and behavior |
|---|---|---|
| Loading | Working Mimiku | Preserve page skeleton and context; announce progress once; never imply success |
| Empty | Idle Mimiku | Explain why it is empty and offer one relevant action; do not fabricate zero-valued financial data |
| Recoverable error | Concerned Mimiku | Plain problem statement, preserved input, retry or alternate action |
| Blocking/permission error | Serious Mimiku | Explain the boundary without revealing private existence or data |
| Offline | Concerned Mimiku | State that fresh financial actions cannot be completed; show cached context only when its age is clear |
| Routine success | Happy Mimiku | Brief acknowledgement, then show the actual resulting state |
| Adventure complete | Celebration asset | Skippable one-time sequence followed by a readable completed summary |

Global error, route error, not-found, and offline surfaces retain navigation or a safe recovery path whenever the session permits it.

## 16. Responsive behavior

The design is accepted at these existing test viewports:

| Class | Reference width | Primary adaptation |
|---|---:|---|
| Phone-small | 320 px | Single column, reduced decoration, compact stage summaries |
| Phone | 390 px | Single column, bottom navigation, full-width sheets |
| Tablet | 768 px | One or two columns based on information relationship, not card count |
| Desktop | 1440 px | Full hierarchy, top navigation, side-by-side workspaces where justified |

Across all four:

- no clipped money, date, status, error, or primary action;
- no document-level horizontal overflow;
- no hover-only action;
- focus order follows reading order after reflow;
- bottom navigation and dialogue respect safe-area insets;
- virtual keyboard does not hide the active field or submit/error region;
- tables become labeled cards or controlled horizontal data regions rather than unreadably small text;
- decorative assets may crop, simplify, or disappear without removing meaning.

## 17. Accessibility acceptance

The redesigned pages must satisfy all of the following:

- WCAG 2.2 AA contrast: at least 4.5:1 for normal text and 3:1 for large text and essential UI boundaries.
- Visible keyboard focus on every interactive element, including scene objects and view toggles.
- Logical heading hierarchy and landmarks independent of visual frames.
- Text alternatives for informative character and scene art; decorative layers use empty alternatives.
- User names and financial roles, not avatar class names, identify people to assistive technology.
- All state labels remain understandable without color, motion, or sound.
- Typewriter text is exposed as one complete announcement.
- `prefers-reduced-motion` removes parallax, inertial cave movement, flying bats, trap animation, repeated idle movement, and celebratory motion while preserving state changes.
- Zoom to 200% does not lose content or operation.
- Pointer gestures have single-pointer alternatives.
- Legal and financial copy remains selectable live text.

## 18. Visual regression and test acceptance

### 18.1 Deterministic capture mode

Visual tests use a deterministic state:

- animation and typewriter progress frozen at documented final frames;
- clock, locale, seeded names, amounts, and dates controlled;
- random Mimiku dialogue replaced with a stable fixture;
- caret, transient toast timers, and non-semantic particles disabled;
- fonts and assets fully loaded before capture.

### 18.2 Required matrices

Capture phone-small, phone, tablet, and desktop for:

- every routed public, auth, and authenticated page;
- default, loading, empty, error, and offline states where applicable;
- long translated strings, long names, large amounts, and dense lists;
- keyboard focus on representative primary and destructive controls;
- reduced-motion mode for Landing, Home, dialogue, and celebration;
- ledger/list view toggles and mode-specific critical flows.

### 18.3 Assertions

Acceptance combines screenshot review with structural assertions. A screenshot threshold alone is insufficient.

Tests must assert:

- no overflow or clipped live financial fields;
- primary action and current state are visible in the intended priority order;
- active navigation and view-toggle state are programmatically exposed;
- images do not contain operational labels, amounts, dates, statuses, or errors;
- scene and character failure does not remove the live action or financial information;
- PWA icon files and manifest purposes resolve;
- semantic asset-registry paths resolve and use the approved rendering tier;
- existing mode-specific accounting and privacy E2E behavior remains unchanged.

## 19. Asset failure and progressive enhancement

The product remains usable when a decorative asset fails or animation is unsupported:

- live heading, content, status, and action stay visible;
- layout reserves only bounded space and does not collapse controls beneath broken images;
- Mimiku's absence cannot block a form or navigation;
- Landing interaction failure falls back to a static cave with the same CTA;
- Home scene failure falls back to the recent-adventure card, greeting text, and navigation;
- icons retain visible text labels in critical financial contexts.

## 20. Design success criteria

The page-visual optimization is successful when:

1. a new visitor can identify Mimic as a financial product with a pixel-RPG identity after the Landing scene and first information chapter;
2. an authenticated user can reach Home, Adventure Log, Guild, Task Center, and Settings without opening a hidden menu on desktop;
3. Home feels like a secret cave base with the user and Mimiku, while the recent adventure remains the first actionable focus;
4. personal overview prioritizes current week/month spending rather than lifetime spending;
5. shared overview prioritizes the user's current receivable/payable position and then the chronological ledger;
6. pooled overview prioritizes available balance and recent activity without collapsing independent accounting states;
7. payer, participant, settlement direction, and current balance cannot be confused with one another;
8. every user decision and financial fact remains live, accessible, and understandable without character art;
9. all four viewport classes pass responsive, keyboard, reduced-motion, and visual-regression acceptance;
10. production page composition begins only after the required asset families have been reviewed and approved.

## 21. Explicitly deferred decisions

The following require a later, separate approval rather than an assumption during implementation:

- final production image generation and exact exported filenames;
- exact typeface licensing and loading strategy;
- optional sound design and default sound preference;
- the number and content of future Landing cave regions beyond the central release area;
- additional Landing interactive objects beyond the initial set;
- custom user avatar uploads, modular avatar construction, or class-specific animation;
- full-scene imagery for personal, shared, or pooled spaces;
- an overdue settlement concept;
- implementation sequencing, estimates, and task breakdown.

These deferrals do not block the approved information hierarchy, responsive behavior, asset-review gate, or acceptance criteria above.
