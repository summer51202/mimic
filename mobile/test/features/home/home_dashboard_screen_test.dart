import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/presentation/home_dashboard_screen.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';

class _MemorySelection implements SelectedGroupPersistence {
  String? value;
  @override
  Future<void> clear() async => value = null;
  @override
  Future<String?> read() async => value;
  @override
  Future<void> write(String groupId) async => value = groupId;
}

const _groups = <GroupSummary>[
  GroupSummary(
    id: 'group-1',
    name: 'Our Home',
    groupType: 'COUPLE',
    memberCount: 2,
    role: 'OWNER',
  ),
  GroupSummary(
    id: 'group-2',
    name: 'Summer Trip',
    groupType: 'GROUP',
    memberCount: 4,
    role: 'MEMBER',
  ),
];

const _fund = FundSummary(
  id: 'fund-1',
  name: 'Date Fund',
  balanceLabel: 'TWD 6,400',
);

HomeSummary _summary({String? groupId = 'group-1'}) => HomeSummary(
      groupId: groupId,
      displayName: 'Edward',
      totalBalanceLabel: 'TWD 6,400',
      activeFunds: const <FundSummary>[_fund],
      recentActivities: const <ActivityPreview>[],
      pendingTasksCount: 2,
    );

Future<GoRouter> _pumpDashboard(
  WidgetTester tester, {
  required HomeSummary summary,
  List<GroupSummary> groups = _groups,
  Size size = const Size(800, 900),
}) async {
  await tester.binding.setSurfaceSize(size);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    initialLocation: AppRoutes.home,
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const HomeDashboardScreen(),
      ),
      GoRoute(
        path: AppRoutes.acceptInvite,
        builder: (_, __) => const Scaffold(body: Text('accept marker')),
      ),
      GoRoute(
        path: AppRoutes.createInvite,
        name: 'create-invite',
        builder: (_, state) => Scaffold(
          body: Text('create marker ${state.pathParameters['groupId']}'),
        ),
      ),
      GoRoute(
        path: AppRoutes.createExpense,
        builder: (_, __) => const Scaffold(body: Text('expense marker')),
      ),
      GoRoute(
        path: AppRoutes.settlement,
        builder: (_, __) => const Scaffold(body: Text('settlement marker')),
      ),
      GoRoute(
        path: AppRoutes.confirmations,
        builder: (_, __) => const Scaffold(body: Text('tasks marker')),
      ),
      GoRoute(
        path: AppRoutes.settings,
        builder: (_, __) => const Scaffold(body: Text('Settings destination')),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        homeSummaryProvider.overrideWith((_) async => summary),
        homeGroupsProvider.overrideWith((_) async => groups),
        selectedGroupProvider.overrideWith(
          (_) => SelectedGroupNotifier(_MemorySelection()),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('keeps existing quick actions and renders at narrow width',
      (WidgetTester tester) async {
    await _pumpDashboard(
      tester,
      summary: _summary(),
      size: const Size(360, 800),
    );

    expect(find.text('Add expense'), findsOneWidget);
    expect(find.text('Settle'), findsOneWidget);
    expect(find.text('Pending tasks'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('shows current group context and switches groups',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _summary());

    expect(find.text('Current group'), findsOneWidget);
    expect(find.text('Our Home'), findsOneWidget);
    expect(find.text('Owner'), findsOneWidget);
    expect(find.text('2 members'), findsOneWidget);

    await tester.tap(find.text('Switch'));
    await tester.pumpAndSettle();
    expect(find.text('Summer Trip'), findsOneWidget);
    await tester.tap(find.text('Summer Trip'));
    await tester.pumpAndSettle();
    expect(find.text('Summer Trip'), findsOneWidget);
    expect(find.text('Member'), findsOneWidget);
    expect(find.text('4 members'), findsOneWidget);
  });

  testWidgets('shows onboarding when the user has no groups',
      (WidgetTester tester) async {
    await _pumpDashboard(
      tester,
      summary: _summary(groupId: null),
      groups: const <GroupSummary>[],
    );

    expect(find.text('You are not in a group yet'), findsOneWidget);
    expect(find.text('Join with code'), findsNWidgets(2));
    expect(find.text('Current group'), findsNothing);
  });

  testWidgets('Join with code is always enabled and navigates to accept route',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _summary(groupId: null));

    final join = find.widgetWithText(OutlinedButton, 'Join with code');
    expect(join, findsOneWidget);
    expect(tester.widget<OutlinedButton>(join).onPressed, isNotNull);
    await tester.tap(join);
    await tester.pumpAndSettle();

    expect(find.text('accept marker'), findsOneWidget);
  });

  testWidgets('Settings button opens the settings route',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _summary());

    await tester.tap(find.byTooltip('Settings'));
    await tester.pumpAndSettle();

    expect(find.text('Settings destination'), findsOneWidget);
  });

  testWidgets('Invite member is disabled without a group id',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _summary(groupId: null));

    final invite = find.widgetWithText(OutlinedButton, 'Invite member');
    expect(invite, findsOneWidget);
    expect(tester.widget<OutlinedButton>(invite).onPressed, isNull);
  });

  testWidgets(
      'Invite member navigates to group invite route and encodes helper paths',
      (WidgetTester tester) async {
    final router = await _pumpDashboard(tester, summary: _summary());
    final invite = find.widgetWithText(OutlinedButton, 'Invite member');

    expect(AppRoutes.createInvite, '/groups/:groupId/invites/new');
    expect(AppRoutes.acceptInvite, '/invites/accept');
    expect(
      AppRoutes.createInvitePath('group one'),
      '/groups/group%20one/invites/new',
    );
    expect(tester.widget<OutlinedButton>(invite).onPressed, isNotNull);
    await tester.tap(invite);
    await tester.pumpAndSettle();

    expect(find.text('create marker group-1'), findsOneWidget);
    expect(router.state.uri.path, '/groups/group-1/invites/new');
  });
}
