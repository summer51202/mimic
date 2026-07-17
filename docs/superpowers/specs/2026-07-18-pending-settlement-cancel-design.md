# Pending Settlement Cancel — Mobile Design

## Goal

Complete the existing pending-settlement cancellation flow on Mobile without changing the Backend or revisiting Phase 3 fund summary and group dashboard work.

## Scope

- Add cancellation to the Mobile settlement repository contract and both demo and remote implementations.
- Identify the actionable settlement from settlement history only when its status is `pending`.
- Add a confirmed Cancel action beside the existing Complete action.
- Prevent duplicate Complete or Cancel requests while either mutation is running.
- Refresh settlement data after a successful mutation.
- Show concise success and failure feedback.
- Add focused repository and widget coverage, then update `.agents/features.md` and append `.agents/devlog.md`.

The Backend cancellation endpoint and settlement state rules remain unchanged. Phase 3 fund summary and group dashboard code is out of scope.

## Architecture

Keep the current feature boundaries:

- `settlement_repository.dart` owns the Mobile contract and HTTP call.
- `settlement_provider.dart` continues to load the settlement summary.
- `settlement_screen.dart` owns short-lived mutation state and confirmation UI.

This delivery will not introduce a new Riverpod mutation controller. The two settlement mutations are small and screen-local, so a stateful consumer widget is sufficient and avoids expanding the batch into a broader settlement refactor.

## Data Model and Pending Selection

`SettlementRepository` gains:

```dart
Future<void> cancelSettlement(String settlementId);
```

The remote implementation calls:

```text
POST /settlements/:settlementId/cancel
{}
```

The current implementation treats the first history item as actionable regardless of status. Instead, `RemoteSettlementRepository.fetchSettlementSummary()` will select the first history DTO whose normalized status is `pending` and whose ID is non-empty. When no such record exists, `currentSettlementId` is `null` and mutation controls are disabled.

## User Experience

When a pending settlement exists, the screen shows both `Complete settlement` and `Cancel settlement`. Cancel uses a destructive visual treatment based on existing design tokens and opens a confirmation dialog explaining that the pending settlement will be canceled without locking the period.

If the user dismisses the dialog or chooses to keep the settlement, no repository call occurs. If the user confirms, both mutation controls are disabled until the request finishes so Complete and Cancel cannot race.

On successful cancellation:

- show `Settlement canceled.`;
- invalidate `settlementProvider(fundId)`;
- allow the provider to reload history and actionable state.

On cancellation failure:

- retain the loaded settlement data;
- re-enable controls;
- show `Unable to cancel settlement right now.`.

The existing Complete action receives the same duplicate-submission protection and refresh behavior. Its current success message remains unchanged.

## Error and Authorization Boundaries

The Mobile app treats the Backend as authoritative for settlement status and authorization. This batch does not infer an Owner role from incomplete settlement summary data and does not alter Backend authorization behavior. API failures are surfaced through the screen-level failure message without exposing raw server details.

## Testing

Use test-driven development with focused red-green cycles:

- Repository test proving cancellation posts to `/settlements/:id/cancel` with an empty payload.
- Repository mapping tests proving completed/canceled history does not produce an actionable ID and pending history does.
- Widget test proving dismissal makes no cancellation call.
- Widget test proving confirmation calls cancellation, shows success feedback, and refreshes the summary.
- Widget test proving cancellation failure shows the stable error message and leaves the controls usable.
- Regression coverage for the existing Complete action after shared mutation-state changes.

Final verification runs Flutter formatting, analyzer, focused settlement tests, and the complete Flutter test suite.

## Documentation

After implementation and verification:

- Promote `cancel-settlement` from `in-progress` to `done` in `.agents/features.md`.
- Append a factual entry to `.agents/devlog.md` with the files changed, verification results, decisions, and remaining gaps.

