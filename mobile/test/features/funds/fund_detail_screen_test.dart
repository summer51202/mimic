import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/funds/data/fund_repository.dart';
import 'package:pairfund_mobile/features/funds/presentation/fund_detail_screen.dart';
import 'package:pairfund_mobile/features/home/data/group_dashboard.dart';

DashboardPeriodTotals totals(
        int c, int e, int n, List<DashboardMemberPosition> members) =>
    DashboardPeriodTotals(
        contributionMinor: c,
        expenseMinor: e,
        netChangeMinor: n,
        memberPositions: members);
FundDetailSummary detail(
        {String id = 'fund-1',
        String name = 'Date Fund',
        int cash = 6400,
        bool empty = false}) =>
    FundDetailSummary(
        fundId: id,
        fundName: name,
        currency: 'TWD',
        cashBalanceMinor: cash,
        periodStart: empty ? null : DateTime.utc(2026, 4, 1),
        periodEnd: empty ? null : DateTime.utc(2026, 4, 30),
        lastCompletedSettlementId: empty ? null : 's1',
        lastCompletedPeriodEnd: empty ? null : DateTime.utc(2026, 3, 31),
        current: totals(
            empty ? 0 : 2000,
            empty ? 0 : 1280,
            empty ? 0 : 720,
            empty
                ? []
                : const [
                    DashboardMemberPosition(
                        userId: 'u1',
                        displayName: 'Edward',
                        membershipStatus: 'active',
                        positionMinor: 800),
                    DashboardMemberPosition(
                        userId: 'u2',
                        displayName: 'Partner',
                        membershipStatus: 'active',
                        positionMinor: -800),
                    DashboardMemberPosition(
                        userId: 'u3',
                        displayName: 'Sam',
                        membershipStatus: 'active',
                        positionMinor: 0)
                  ]),
        allTime: totals(
            empty ? 0 : 10000,
            empty ? 0 : 3600,
            empty ? 0 : 6400,
            empty
                ? []
                : const [
                    DashboardMemberPosition(
                        userId: 'u4',
                        displayName: 'Former',
                        membershipStatus: 'removed',
                        positionMinor: 500)
                  ]),
        recentActivity: empty
            ? []
            : [
                FundActivityItem(
                    type: FundActivityType.expense,
                    title: 'Dinner',
                    occurredOn: DateTime.utc(2026, 4, 1),
                    amountMinor: 880)
              ]);

class FakeRepository implements FundRepository {
  FakeRepository(this.loader);
  final Future<FundDetailSummary> Function(String) loader;
  int calls = 0;
  final ids = <String>[];
  @override
  Future<FundDetailSummary> fetchFundDetail(String id) {
    calls++;
    ids.add(id);
    return loader(id);
  }
}

Future<GoRouter> pump(WidgetTester tester, FakeRepository repo,
    {String initial = '/funds/fund-1',
    Size size = const Size(800, 900),
    double scale = 1}) async {
  await tester.binding.setSurfaceSize(size);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(initialLocation: initial, routes: [
    GoRoute(
        path: AppRoutes.fundDetail,
        builder: (_, s) =>
            FundDetailScreen(fundId: s.pathParameters['fundId']!)),
    GoRoute(
        path: AppRoutes.fundActivity,
        builder: (_, s) =>
            Scaffold(body: Text('activity ${s.pathParameters['fundId']}'))),
    GoRoute(
        path: AppRoutes.createExpense,
        builder: (_, s) =>
            Scaffold(body: Text('expense ${s.pathParameters['fundId']}'))),
    GoRoute(
        path: AppRoutes.createContribution,
        builder: (_, s) =>
            Scaffold(body: Text('contribution ${s.pathParameters['fundId']}'))),
    GoRoute(
        path: AppRoutes.settlement,
        builder: (_, s) =>
            Scaffold(body: Text('settlement ${s.pathParameters['fundId']}'))),
  ]);
  addTearDown(router.dispose);
  await tester.pumpWidget(ProviderScope(
      overrides: [fundRepositoryProvider.overrideWithValue(repo)],
      child: MaterialApp.router(
          routerConfig: router,
          builder: (c, child) => MediaQuery(
              data: MediaQuery.of(c)
                  .copyWith(textScaler: TextScaler.linear(scale)),
              child: child!))));
  return router;
}

void main() {
  testWidgets(
      'defaults current and switches all time locally while cash stays fixed',
      (t) async {
    final r = FakeRepository((_) async => detail());
    await pump(t, r);
    await t.pumpAndSettle();
    expect(find.text('TWD 2,000'), findsOneWidget);
    expect(find.text('TWD 6,400'), findsOneWidget);
    await t.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await t.pump();
    expect(find.text('TWD 10,000'), findsOneWidget);
    expect(find.text('TWD 6,400'), findsWidgets);
    expect(r.calls, 1);
  });
  testWidgets('shows period settlement positions former and formatted activity',
      (t) async {
    final r = FakeRepository((_) async => detail());
    await pump(t, r);
    await t.pumpAndSettle();
    expect(
        find.text('Current period: 2026-04-01 – 2026-04-30'), findsOneWidget);
    expect(find.textContaining('2026-03-31'), findsOneWidget);
    expect(find.text('Receivable'), findsOneWidget);
    expect(find.text('Payable'), findsOneWidget);
    expect(find.text('Balanced'), findsOneWidget);
    expect(find.textContaining('TWD 880'), findsOneWidget);
    await t.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await t.pump();
    expect(find.textContaining('Former member'), findsOneWidget);
  });
  for (final action in {
    'View activity': '/funds/fund-1/activity',
    'Record expense': '/funds/fund-1/expenses/new',
    'Add contribution': '/funds/fund-1/contributions/new',
    'View settlement': '/funds/fund-1/settlement'
  }.entries) {
    testWidgets('${action.key} exact route', (t) async {
      final r = FakeRepository((_) async => detail());
      final router = await pump(t, r);
      await t.pumpAndSettle();
      await t.ensureVisible(find.text(action.key));
      await t.tap(find.text(action.key));
      await t.pumpAndSettle();
      expect(router.state.uri.path, action.value);
    });
  }
  testWidgets('empty fund exposes both record actions', (t) async {
    final r = FakeRepository((_) async => detail(empty: true));
    await pump(t, r);
    await t.pumpAndSettle();
    expect(find.text('No records yet'), findsOneWidget);
    expect(find.text('Record expense'), findsOneWidget);
    expect(find.text('Add contribution'), findsOneWidget);
  });
  testWidgets('shows loading', (t) async {
    final gate = Completer<FundDetailSummary>();
    final r = FakeRepository((_) => gate.future);
    await pump(t, r);
    await t.pump();
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    gate.complete(detail());
    await t.pumpAndSettle();
  });
  testWidgets('retry succeeds exactly once after error', (t) async {
    var attempt = 0;
    final r = FakeRepository((_) {
      attempt++;
      if (attempt == 1) throw StateError('x');
      return Future.value(detail());
    });
    await pump(t, r);
    await t.pumpAndSettle();
    expect(find.text('Unable to load this fund right now.'), findsOneWidget);
    expect(find.text('Retry'), findsOneWidget);
    await t.tap(find.text('Retry'));
    await t.pumpAndSettle();
    expect(r.calls, 2);
    expect(find.text('Date Fund'), findsOneWidget);
  });
  testWidgets('360px large text long values do not overflow and scope works',
      (t) async {
    final r = FakeRepository((_) async => detail(
        name: 'A very long fund name for a shared international household',
        cash: 9007199254740000));
    await pump(t, r, size: const Size(360, 900), scale: 2);
    await t.pumpAndSettle();
    expect(t.takeException(), isNull);
    await t.ensureVisible(find.byKey(const Key('dashboard-scope-all-time')));
    await t.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await t.pump();
    expect(t.takeException(), isNull);
  });
  testWidgets('new fund id resets scope and removes old data', (t) async {
    final r = FakeRepository((id) async =>
        id == 'fund-1' ? detail() : detail(id: id, name: 'Travel Fund'));
    final router = await pump(t, r);
    await t.pumpAndSettle();
    await t.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await t.pump();
    router.go('/funds/fund-2');
    await t.pumpAndSettle();
    expect(find.text('Travel Fund'), findsOneWidget);
    expect(find.text('Date Fund'), findsNothing);
    expect(find.text('TWD 2,000'), findsOneWidget);
    expect(r.ids, ['fund-1', 'fund-2']);
  });
}
