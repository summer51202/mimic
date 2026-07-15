import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/activity/data/activity_repository.dart';
import 'package:pairfund_mobile/features/activity/data/remote/activity_remote_mapper.dart';
import 'package:pairfund_mobile/features/activity/presentation/activity_screen.dart';

class FakeActivityRepository implements ActivityRepository {
  @override
  Future<ActivityTimeline> fetchActivity(String fundId) async {
    return const ActivityTimeline(
      items: <ActivityTimelineItem>[
        ActivityTimelineItem(
          id: 'expense-1',
          kind: ActivityKind.expense,
          title: 'Dinner',
          subtitle: 'Expense',
          amountLabel: 'TWD 880',
          occurredOn: '2026-04-10',
        ),
        ActivityTimelineItem(
          id: 'expense-2',
          kind: ActivityKind.correction,
          title: 'Correction for March split',
          subtitle: 'Correction entry',
          amountLabel: 'TWD 200',
          occurredOn: '2026-04-09',
          statusLabel: 'correction',
        ),
        ActivityTimelineItem(
          id: 'settlement-1',
          kind: ActivityKind.settlement,
          title: 'Settlement',
          subtitle: '2026-03-01 to 2026-03-31',
          amountLabel: 'TWD 800',
          occurredOn: '2026-03-31',
          statusLabel: 'completed',
        ),
      ],
    );
  }
}

void main() {
  testWidgets('renders activity timeline rows from provider', (WidgetTester tester) async {
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
}
