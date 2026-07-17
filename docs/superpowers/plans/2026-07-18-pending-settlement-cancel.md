# Pending Settlement Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete Mobile cancellation for pending settlements, expose actions only for pending history, and refresh the settlement view after safe, confirmed mutations.

**Architecture:** Extend the settlement repository contract for the cancel endpoint and correct actionable-ID derivation at the remote boundary. Convert the screen to a stateful consumer solely for short-lived mutation locking, confirmation, feedback, and provider invalidation.

**Tech Stack:** Flutter, Dart, Riverpod, `flutter_test`, PairFund `PairFundApiClient`

---

### Task 1: Correct actionable settlement selection

**Files:**
- Modify: `mobile/test/features/settlements/settlement_repository_test.dart`
- Modify: `mobile/lib/features/settlements/data/settlement_repository.dart`

- [ ] **Step 1: Write failing mapping tests**

Change the completed-only expectation to `expect(summary.currentSettlementId, isNull)`. Add a response containing completed history followed by a non-empty `pending` item and expect its ID.

- [ ] **Step 2: Run test and verify RED**

Run from `mobile/`: `flutter test test/features/settlements/settlement_repository_test.dart`.
Expected: completed-only case fails because the repository returns the completed ID.

- [ ] **Step 3: Implement pending-only selection**

Scan `historyDtos` in server order and retain the first DTO satisfying:

```dart
dto.status.toLowerCase() == 'pending' && dto.id.isNotEmpty
```

Set `currentSettlementId` to that nullable ID.

- [ ] **Step 4: Re-run the focused test and verify GREEN**

Expected: completed/canceled history produces null; pending history produces the pending ID.

### Task 2: Add the cancellation repository contract

**Files:**
- Modify: `mobile/test/features/settlements/settlement_repository_completion_test.dart`
- Modify: `mobile/lib/features/settlements/data/settlement_repository.dart`
- Modify: settlement test fakes implementing `SettlementRepository`

- [ ] **Step 1: Write the failing endpoint test**

```dart
await repository.cancelSettlement('settlement-1');
expect(apiClient.lastPostPath, '/settlements/settlement-1/cancel');
expect(apiClient.lastPostData, isEmpty);
```

- [ ] **Step 2: Run test and verify RED**

Run: `flutter test test/features/settlements/settlement_repository_completion_test.dart`.
Expected: compilation fails because `cancelSettlement` is absent.

- [ ] **Step 3: Implement minimal contract**

Add `Future<void> cancelSettlement(String settlementId)` to the interface. Demo delays consistently with Complete. Remote posts:

```dart
await _apiClient.post(
  '/settlements/$settlementId/cancel',
  data: <String, dynamic>{},
);
```

- [ ] **Step 4: Verify GREEN**

Run both settlement repository test files. Expected: all pass.

### Task 3: Add confirmed cancellation and mutation safety

**Files:**
- Modify: `mobile/test/features/settlements/settlement_completion_screen_test.dart`
- Modify: `mobile/lib/features/settlements/presentation/settlement_screen.dart`

- [ ] **Step 1: Write failing widget tests**

Extend the fake with fetch/cancel counts, optional errors, and a completer. Test separately that dismissal makes zero calls, confirmation makes one call, success shows `Settlement canceled.` and refetches, failure shows `Unable to cancel settlement right now.`, and both actions disable while a mutation is pending.

- [ ] **Step 2: Run test and verify RED**

Run: `flutter test test/features/settlements/settlement_completion_screen_test.dart`.
Expected: failures because the Cancel action and mutation state do not exist.

- [ ] **Step 3: Implement minimal screen behavior**

Convert to `ConsumerStatefulWidget` with a private `_isMutating` flag. Add a dialog with `Keep settlement` and `Cancel settlement`. On confirmation, lock both actions, call the repository, show stable feedback, and invalidate:

```dart
ref.invalidate(settlementProvider(widget.fundId));
```

Apply the same lock, error handling, and successful invalidation to Complete. Restore state in `finally` with mounted checks.

- [ ] **Step 4: Verify GREEN**

Re-run the widget test. Expected: all completion/cancellation cases pass.

- [ ] **Step 5: Run focused feature tests**

Run: `flutter test test/features/settlements`.
Expected: all settlement tests pass.

### Task 4: Verify and document delivery

**Files:**
- Modify: `.agents/features.md`
- Modify: `.agents/devlog.md`
- Format: changed Dart files

- [ ] **Step 1: Format**

Run `dart format` on every changed Dart file. Expected: exit 0.

- [ ] **Step 2: Static analysis**

Run from `mobile/`: `flutter analyze`. Expected: `No issues found!`.

- [ ] **Step 3: Full regression suite**

Run from `mobile/`: `flutter test`. Expected: all tests pass.

- [ ] **Step 4: Update records**

Promote `cancel-settlement` to `done` in `.agents/features.md`. Append a 2026-07-18 devlog entry containing scope, changes, decisions, exact verification results, and remaining gaps.

- [ ] **Step 5: Self-review and final diff checks**

Run `git diff --check`, inspect `git status --short`, `git diff --stat`, and the complete diff. Review correctness, edge cases, completeness, architecture, style, security, and test coverage; fix all critical or important findings and repeat focused verification.

