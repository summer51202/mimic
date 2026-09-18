# Page Visual Phase 1 Asset Consumer Matrix

**Baseline:** `a157a83`
**Review scope:** calibration and staging only; no runtime promotion or page composition

Amounts, dates, names, statuses, errors, form labels, and actions remain live HTML. Personal, shared, and pooled accounting meanings remain separate. Every asset below is progressive enhancement and must fail without removing facts, navigation, recovery, or action.

| Family | Named future consumers | Live-HTML and fallback boundary | Accessibility boundary |
|---|---|---|---|
| Wordmark | Landing; Home; public header; authenticated top rail; compact brand link | A live `MIMIC` fallback remains visible when art is absent; motion is decorative. | The graphic has an accessible `MIMIC` text alternative; compact uses do not duplicate an adjacent accessible name. |
| Icons | PWA install icons; favicon; five primary navigation entries; record-expense action; personal/shared/pooled mode badges; expense/contribution/reimbursement/shortfall/return/settlement/correction/lock/offline event types | Critical controls and financial event rows retain visible text. An icon never supplies the only action, mode, event type, status, or accounting meaning. | Controls retain an accessible name from live text or `aria-label`; mode and event meaning never relies on hue alone. |
| Mimiku states/actions | Auth; invite; shared route states; loading/empty/error/offline/success; Home dialogue; record/invite/settle/pooled/guide/complete actions | The full live message and all actions remain present. Character absence never blocks navigation, submission, recovery, or an explanation. | Informative states receive contextual alternative text; decorative repeats use empty alternatives. Serious and Concerned are not the only signal for an error class. |
| Avatar classes | Registration follow-up; Settings; party roster; payer/participant formation; balance roster; activity actor | Every person is identified by live name and role, never by class. Duplicate classes are allowed and class has no permission or accounting meaning. | Assistive technology receives the person's name and financial/governance role, not a class name as identity. |
| Scenes | Landing cave; Home secret base only | Landing CTA, Home recent-adventure card, navigation, greeting, and every financial fact stay live and usable if a scene fails. | Scene layers are decorative unless a concise description adds page context; interactive objects are separate named HTML controls. |
| Frames | Shared panels; legal reading surface; dialogue; adventure notebook; guild board; settlement board | Semantic landmarks, headings, controls, content order, padding, and status survive without border art. | Frames are decorative. Reading order and state remain expressed by semantic HTML. |
| Props | Landing torch/bats/trap/treasure/wall/passages; feature chapter cues; financial-mode/event decoration | Interactive Landing props are named buttons. Finance props remain decoration beside live labels and never carry a reward or financial state. | Interactive props have live accessible names and single-pointer alternatives; decorative props have empty alternatives. |
| Motion | Wordmark glance/blink; 2–4-frame base states; 4–6-frame actions; cave props; dialogue typewriter; one-time celebration | Only one primary character animation runs at once. Motion never delays navigation or action. Reduced motion exposes the final state immediately. | Full dialogue is announced once, focus is not stolen, skip is keyboard-accessible, and state changes remain understandable without motion. |

## Mode isolation checks

- Personal imagery may decorate private spending but cannot imply payers, transfers, pooled availability, or a cross-mode total.
- Shared imagery must keep expense participants, paid/allocated positions, settlement transfers, and later signed corrections visually distinct. Expense rows do not use debt arrows.
- Pooled imagery must not merge book, available, reimbursement, occurrence, contribution, or shortfall states.
- Locked settled periods remain immutable; Serious imagery accompanies live text directing corrections to a later signed event, never edit-in-place.
