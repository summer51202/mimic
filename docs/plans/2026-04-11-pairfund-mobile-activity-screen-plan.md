# PairFund Mobile Activity Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a remote-backed fund activity screen that shows a unified timeline of expenses, contributions, settlements, and correction entries with lightweight status affordances.

**Architecture:** Build the activity screen as a fund-specific read model. Use one `ActivityRepository` to aggregate remote expense, contribution, and settlement endpoints into a single timeline model, expose it through a Riverpod `FutureProvider`, and render a simple timeline UI with loading, empty, and error states. Keep MVP scope narrow: no filters, no record detail screen, no edit/delete actions.

**Tech Stack:** Flutter, Riverpod, Dio-backed repositories, existing PairFund API client, flutter_test

---

## Scope

This plan covers:

* fund activity remote repository
* unified activity timeline model
* activity provider
* activity screen UI
* loading / empty / error states
* status affordances for correction and settlement items
* repository tests
* widget tests

This plan does **not** cover:

* record detail screen
* filters
* edit / delete / restore actions
* pagination
* grouping by date section header

## File Map

### Existing files to modify

* `mobile/lib/features/activity/presentation/activity_screen.dart`
  * replace placeholder content with real timeline UI
* `mobile/lib/app/router/app_router.dart`
  * pass `fundId` into activity screen instead of only a display title
* `mobile/lib/features/funds/presentation/fund_detail_screen.dart`
  * keep the activity CTA pointed at the fund-specific route
* `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
  * update activity status after implementation
* `docs/design/pairfund-mobile-flutter-spec-v0.2.md`
  * document activity screen remote behavior and current scope

### New files to create

* `mobile/lib/features/activity/data/activity_repository.dart`
* `mobile/lib/features/activity/data/remote/activity_remote_mapper.dart`
* `mobile/lib/features/activity/providers/activity_provider.dart`
* `mobile/test/features/activity/activity_repository_test.dart`
* `mobile/test/features/activity/activity_screen_test.dart`

## Task 1: Add Remote Activity Repository Contract

**Files:**
* Create: `mobile/lib/features/activity/data/activity_repository.dart`
* Create: `mobile/lib/features/activity/data/remote/activity_remote_mapper.dart`
* Create: `mobile/test/features/activity/activity_repository_test.dart`

- [ ] **Step 1: Write the failing repository test**

```dart
test('remote activity repository combines expenses contributions and settlements', () async {
  final repository = RemoteActivityRepository(
    FakeApiClient(
      <String, Map<String, dynamic>>{
        '/funds/fund-1/expenses': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'expense-1',
              'title': 'Dinner',
              'occurred_on': '2026-04-10',
              'amount_minor': 880,
              'expense_type': 'fund_expense',
            },
            <String, dynamic>{
              'id': 'expense-2',
              'title': 'Correction for March split',
              'occurred_on': '2026-04-09',
              'amount_minor': 200,
              'expense_type': 'correction',
            },
          ],
        },
        '/funds/fund-1/contributions': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'contribution-1',
              'occurred_on': '2026-04-08',
              'amount_minor': 1000,
              'contribution_type': 'one_time',
            },
          ],
        },
        '/funds/fund-1/settlements': <String, dynamic>{
          'data': <Map<String, dynamic>>[
            <String, dynamic>{
              'id': 'settlement-1',
              'status': 'completed',
              'amount_minor': 800,
              'period_start': '2026-03-01',
              'period_end': '2026-03-31',
            },
          ],
        },
      },
    ),
  );

  final timeline = await repository.fetchActivity('fund-1');

  expect(timeline.items.length, 4);
  expect(timeline.items.first.id, 'expense-1');
  expect(timeline.items[1].kind, ActivityKind.correction);
  expect(timeline.items[2].kind, ActivityKind.contribution);
  expect(timeline.items.last.kind, ActivityKind.settlement);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/activity/activity_repository_test.dart
```

Expected:

* FAIL because activity repository and models do not exist yet.

- [ ] **Step 3: Add minimal repository and mapper implementation**

Create timeline model:

```dart
enum ActivityKind {
  expense,
  correction,
  contribution,
  settlement,
}

class ActivityTimelineItem {
  const ActivityTimelineItem({
    required this.id,
    required this.kind,
    required this.title,
    required this.subtitle,
    required this.amountLabel,
    required this.occurredOn,
    this.statusLabel,
  });

  final String id;
  final ActivityKind kind;
  final String title;
  final String subtitle;
  final String amountLabel;
  final String occurredOn;
  final String? statusLabel;
}

class ActivityTimeline {
  const ActivityTimeline({required this.items});
  final List<ActivityTimelineItem> items;
}
```

Create repository contract:

```dart
abstract class ActivityRepository {
  Future<ActivityTimeline> fetchActivity(String fundId);
}
```

Remote implementation should call:

* `GET /funds/{fundId}/expenses?page=1&page_size=20`
* `GET /funds/{fundId}/contributions?page=1&page_size=20`
* `GET /funds/{fundId}/settlements?page=1&page_size=20`

And then:

* map each list into timeline items
* infer `ActivityKind.correction` when `expense_type == correction`
* sort descending by event date string

- [ ] **Step 4: Run test to verify it passes**

Run:

```powershell
flutter test test/features/activity/activity_repository_test.dart
```

Expected:

* PASS

- [ ] **Step 5: Commit**

```bash
git add mobile/lib/features/activity/data mobile/test/features/activity/activity_repository_test.dart
git commit -m "feat: add remote activity repository"
```

## Task 2: Add Activity Provider

**Files:**
* Create: `mobile/lib/features/activity/providers/activity_provider.dart`

- [ ] **Step 1: Add fund-scoped provider**

```dart
final activityProvider =
    FutureProvider.autoDispose.family<ActivityTimeline, String>((ref, fundId) {
  return ref.watch(activityRepositoryProvider).fetchActivity(fundId);
});
```

- [ ] **Step 2: Keep repository provider dual-mode**

Add `DemoActivityRepository` with stable mock items so the screen still works in demo mode.

- [ ] **Step 3: Commit**

```bash
git add mobile/lib/features/activity/providers/activity_provider.dart mobile/lib/features/activity/data/activity_repository.dart
git commit -m "feat: add activity provider"
```

## Task 3: Replace Placeholder Activity Screen

**Files:**
* Modify: `mobile/lib/features/activity/presentation/activity_screen.dart`
* Create: `mobile/test/features/activity/activity_screen_test.dart`
* Modify: `mobile/lib/app/router/app_router.dart`

- [ ] **Step 1: Write the failing widget test**

```dart
testWidgets('renders activity timeline rows from provider', (tester) async {
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        activityRepositoryProvider.overrideWithValue(FakeActivityRepository()),
      ],
      child: const MaterialApp(
        home: ActivityScreen(fundId: 'fund-1'),
      ),
    ),
  );
  await tester.pumpAndSettle();

  expect(find.text('Activity timeline'), findsOneWidget);
  expect(find.text('Dinner'), findsOneWidget);
  expect(find.text('Correction for March split'), findsOneWidget);
  expect(find.text('completed'), findsOneWidget);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
flutter test test/features/activity/activity_screen_test.dart
```

Expected:

* FAIL because the screen is still static placeholder UI.

- [ ] **Step 3: Build minimal timeline UI**

Recommended UI structure:

```dart
Scaffold(
  appBar: AppBar(title: const Text('Activity')),
  body: activityAsync.when(
    data: (timeline) {
      if (timeline.items.isEmpty) {
        return const Center(child: Text('No activity yet.'));
      }

      return ListView(
        padding: const EdgeInsets.all(PfSpacing.md),
        children: [
          Text('Activity timeline'),
          ...timeline.items.map(
            (item) => Card(
              child: ListTile(
                title: Text(item.title),
                subtitle: Text(item.subtitle),
                trailing: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(item.amountLabel),
                    if (item.statusLabel != null) Text(item.statusLabel!),
                  ],
                ),
              ),
            ),
          ),
        ],
      );
    },
    loading: () => const Center(child: CircularProgressIndicator()),
    error: (_, __) => const Center(child: Text('Unable to load activity right now.')),
  ),
);
```

- [ ] **Step 4: Update route builder**

Change:

```dart
return ActivityScreen(title: 'Fund activity for $fundId');
```

To:

```dart
return ActivityScreen(fundId: fundId);
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
flutter test test/features/activity/activity_screen_test.dart
```

Expected:

* PASS

- [ ] **Step 6: Commit**

```bash
git add mobile/lib/features/activity/presentation/activity_screen.dart mobile/lib/app/router/app_router.dart mobile/test/features/activity/activity_screen_test.dart
git commit -m "feat: add remote-backed activity screen"
```

## Task 4: Sync Docs

**Files:**
* Modify: `docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md`
* Modify: `docs/design/pairfund-mobile-flutter-spec-v0.2.md`

- [ ] **Step 1: Update readiness checklist**

Change activity from:

* `Demo-only`

To:

* `Ready`

With notes:

* screen aggregates expenses, contributions, and settlements
* no filters yet
* no record detail yet

- [ ] **Step 2: Update Flutter spec**

Add to activity screen notes:

* fund-scoped timeline is remote-backed
* correction entries reuse expense records with correction type
* settlement rows can show completed / pending status
* filters and detail view remain future work

- [ ] **Step 3: Run focused regression tests**

Run:

```powershell
flutter test test/features/activity/activity_repository_test.dart
flutter test test/features/activity/activity_screen_test.dart
flutter test test/features/funds/fund_detail_screen_test.dart
```

Expected:

* PASS

- [ ] **Step 4: Commit**

```bash
git add docs/design/pairfund-mobile-remote-readiness-checklist-v0.2.md docs/design/pairfund-mobile-flutter-spec-v0.2.md
git commit -m "docs: sync activity screen remote readiness"
```

## Self-Review

### Spec Coverage

Covered by this plan:

* activity repository
* remote-backed activity timeline
* correction and settlement status affordance
* activity screen loading / empty / error states
* docs sync

Not covered intentionally:

* filters
* record detail
* edit / delete / restore
* pagination

### Placeholder Scan

No TODO-only steps are left intentionally. Each task contains exact file targets, concrete code examples, and verification commands.

### Type Consistency

This plan keeps naming aligned with existing feature slices:

* `ActivityScreen`
* `activityRepositoryProvider`
* `activityProvider`
* `ActivityTimeline`
* `ActivityTimelineItem`
