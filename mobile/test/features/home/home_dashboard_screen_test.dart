import 'dart:async';
import 'dart:ui' show SemanticsAction;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/home/data/group_dashboard.dart';
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
    members: <GroupMemberSummary>[
      GroupMemberSummary(id: 'user-1', displayName: 'Edward', role: 'OWNER'),
      GroupMemberSummary(id: 'user-2', displayName: 'Alice', role: 'MEMBER'),
    ],
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

GroupDashboard _dashboard({
  String groupId = 'group-1',
  String groupName = 'Our Home',
  String defaultCurrency = 'TWD',
  List<CurrencyDashboard>? currencies,
}) =>
    GroupDashboard(
      groupId: groupId,
      groupName: groupName,
      defaultCurrency: defaultCurrency,
      currencies: currencies ??
          <CurrencyDashboard>[
            CurrencyDashboard(
              currency: 'TWD',
              cashBalanceMinor: 120000,
              current: DashboardPeriodTotals(
                netChangeMinor: 20000,
                contributionMinor: 50000,
                expenseMinor: 30000,
                memberPositions: const <DashboardMemberPosition>[
                  DashboardMemberPosition(
                    userId: 'user-1',
                    displayName: 'Edward',
                    membershipStatus: 'active',
                    positionMinor: 15000,
                  ),
                  DashboardMemberPosition(
                    userId: 'user-2',
                    displayName: 'Alice',
                    membershipStatus: 'active',
                    positionMinor: -15000,
                  ),
                  DashboardMemberPosition(
                    userId: 'user-3',
                    displayName: 'Sam',
                    membershipStatus: 'active',
                    positionMinor: 0,
                  ),
                ],
              ),
              allTime: DashboardPeriodTotals(
                netChangeMinor: 120000,
                contributionMinor: 180000,
                expenseMinor: 60000,
                memberPositions: const <DashboardMemberPosition>[
                  DashboardMemberPosition(
                    userId: 'former',
                    displayName: 'Former partner',
                    membershipStatus: 'removed',
                    positionMinor: 5000,
                  ),
                ],
              ),
              funds: <DashboardFundCard>[
                DashboardFundCard(
                  fundId: 'fund-dashboard',
                  name: 'Household',
                  cashBalanceMinor: 120000,
                  currentNetChangeMinor: 20000,
                  periodStart: DateTime.utc(2026, 7, 1),
                  periodEnd: DateTime.utc(2026, 7, 17),
                ),
              ],
            ),
            CurrencyDashboard(
              currency: 'USD',
              cashBalanceMinor: 9900,
              current: DashboardPeriodTotals(
                netChangeMinor: -100,
                contributionMinor: 2000,
                expenseMinor: 2100,
                memberPositions: const <DashboardMemberPosition>[],
              ),
              allTime: DashboardPeriodTotals(
                netChangeMinor: 9900,
                contributionMinor: 12000,
                expenseMinor: 2100,
                memberPositions: const <DashboardMemberPosition>[],
              ),
              funds: const <DashboardFundCard>[],
            ),
          ],
    );

HomeSummary _dashboardSummary({
  String groupId = 'group-1',
  GroupDashboard? dashboard,
}) {
  return HomeSummary(
    groupId: groupId,
    displayName: 'Edward',
    totalBalanceLabel: 'TWD 120,000',
    activeFunds: const <FundSummary>[_fund],
    recentActivities: const <ActivityPreview>[],
    pendingTasksCount: 2,
    dashboard: dashboard ?? _dashboard(),
  );
}

class _DashboardHomeRepository implements HomeRepository {
  _DashboardHomeRepository({
    required this.groups,
    required this.summaries,
    this.pendingSummary,
    this.groupsFailuresRemaining = 0,
  });

  final List<GroupSummary> groups;
  final Map<String, HomeSummary> summaries;
  final Completer<HomeSummary>? pendingSummary;
  int groupsFailuresRemaining;
  int groupsRequests = 0;
  final List<String?> requestedGroupIds = <String?>[];

  @override
  Future<List<GroupSummary>> fetchGroups() async {
    groupsRequests += 1;
    if (groupsFailuresRemaining > 0) {
      groupsFailuresRemaining -= 1;
      throw StateError('groups failed');
    }
    return groups;
  }

  @override
  Future<HomeSummary> fetchSummary({required String? groupId}) {
    requestedGroupIds.add(groupId);
    if (pendingSummary != null) return pendingSummary!.future;
    return Future<HomeSummary>.value(summaries[groupId]);
  }
}

Future<GoRouter> _pumpRepositoryDashboard(
  WidgetTester tester, {
  required _DashboardHomeRepository repository,
  bool settle = true,
}) async {
  final router = GoRouter(
    initialLocation: AppRoutes.home,
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const HomeDashboardScreen(),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        homeRepositoryProvider.overrideWithValue(repository),
        selectedGroupProvider.overrideWith(
          (_) => SelectedGroupNotifier(_MemorySelection()),
        ),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  if (settle) await tester.pumpAndSettle();
  return router;
}

Future<GoRouter> _pumpDashboard(
  WidgetTester tester, {
  required HomeSummary summary,
  List<GroupSummary> groups = _groups,
  Size size = const Size(800, 900),
  Future<HomeSummary> Function()? summaryLoader,
  double textScale = 1,
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
        path: AppRoutes.createGroup,
        builder: (_, __) => const Scaffold(body: Text('create group marker')),
      ),
      GoRoute(
        path: AppRoutes.groupDetail,
        builder: (_, state) => Scaffold(
          body: Text('group detail marker ${state.pathParameters['groupId']}'),
        ),
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
      GoRoute(
        path: AppRoutes.fundDetail,
        builder: (_, state) => Scaffold(
          body: Text('fund marker ${state.pathParameters['fundId']}'),
        ),
      ),
      GoRoute(
        path: AppRoutes.createFund,
        builder: (_, __) => const Scaffold(body: Text('create fund marker')),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        homeSummaryProvider.overrideWith(
          (_) => summaryLoader?.call() ?? Future<HomeSummary>.value(summary),
        ),
        homeGroupsProvider.overrideWith((_) async => groups),
        selectedGroupProvider.overrideWith(
          (_) => SelectedGroupNotifier(_MemorySelection()),
        ),
      ],
      child: MaterialApp.router(
        routerConfig: router,
        builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
            textScaler: TextScaler.linear(textScale),
          ),
          child: child!,
        ),
      ),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets(
      'group switch refreshes dashboard and resets all-time scope to current',
      (WidgetTester tester) async {
    final groupTwoDashboard = _dashboard(
      groupId: 'group-2',
      groupName: 'Summer Trip',
      defaultCurrency: 'JPY',
      currencies: <CurrencyDashboard>[
        CurrencyDashboard(
          currency: 'JPY',
          cashBalanceMinor: 7000,
          current: DashboardPeriodTotals(
            netChangeMinor: 300,
            contributionMinor: 500,
            expenseMinor: 200,
            memberPositions: const <DashboardMemberPosition>[],
          ),
          allTime: DashboardPeriodTotals(
            netChangeMinor: 7000,
            contributionMinor: 9000,
            expenseMinor: 2000,
            memberPositions: const <DashboardMemberPosition>[],
          ),
          funds: const <DashboardFundCard>[
            DashboardFundCard(
              fundId: 'japan-fund',
              name: 'Japan Fund',
              cashBalanceMinor: 7000,
              currentNetChangeMinor: 300,
              periodStart: null,
              periodEnd: null,
            ),
          ],
        ),
      ],
    );
    final repository = _DashboardHomeRepository(
      groups: _groups,
      summaries: <String, HomeSummary>{
        'group-1': _dashboardSummary(),
        'group-2': _dashboardSummary(
          groupId: 'group-2',
          dashboard: groupTwoDashboard,
        ),
      },
    );
    await _pumpRepositoryDashboard(tester, repository: repository);

    await tester.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await tester.pump();
    expect(find.text('TWD 180,000'), findsOneWidget);

    await tester.tap(find.text('Switch'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Summer Trip'));
    await tester.pumpAndSettle();

    expect(repository.requestedGroupIds, <String?>['group-1', 'group-2']);
    expect(find.text('JPY 500'), findsOneWidget);
    expect(find.text('JPY 9,000'), findsNothing);
    expect(find.text('Japan Fund'), findsOneWidget);
    expect(find.text('Household'), findsNothing);
  });

  testWidgets('selected group dashboard shows loading without stale data',
      (WidgetTester tester) async {
    final pending = Completer<HomeSummary>();
    final repository = _DashboardHomeRepository(
      groups: _groups,
      summaries: const <String, HomeSummary>{},
      pendingSummary: pending,
    );
    await _pumpRepositoryDashboard(
      tester,
      repository: repository,
      settle: false,
    );
    await tester.pump();
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(find.text('Household'), findsNothing);
    expect(find.text('TWD 120,000'), findsNothing);

    pending.complete(_dashboardSummary());
    await tester.pumpAndSettle();
  });

  testWidgets('retry recovers when the initial groups request fails',
      (WidgetTester tester) async {
    final repository = _DashboardHomeRepository(
      groups: _groups,
      summaries: <String, HomeSummary>{'group-1': _dashboardSummary()},
      groupsFailuresRemaining: 1,
    );
    await _pumpRepositoryDashboard(tester, repository: repository);

    expect(
        find.text('Unable to load your dashboard right now.'), findsOneWidget);
    expect(repository.groupsRequests, 1);
    expect(repository.requestedGroupIds, isEmpty);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Retry'));
    await tester.pumpAndSettle();

    expect(repository.groupsRequests, 2);
    expect(repository.requestedGroupIds, <String?>['group-1']);
    expect(find.text('Present cash'), findsNWidgets(2));
  });

  testWidgets('currency with no funds or members shows explicit empty states',
      (WidgetTester tester) async {
    final emptyCurrency = CurrencyDashboard(
      currency: 'EUR',
      cashBalanceMinor: 0,
      current: DashboardPeriodTotals(
        netChangeMinor: 0,
        contributionMinor: 0,
        expenseMinor: 0,
        memberPositions: const <DashboardMemberPosition>[],
      ),
      allTime: DashboardPeriodTotals(
        netChangeMinor: 0,
        contributionMinor: 0,
        expenseMinor: 0,
        memberPositions: const <DashboardMemberPosition>[],
      ),
      funds: const <DashboardFundCard>[],
    );
    await _pumpDashboard(
      tester,
      summary: _dashboardSummary(
        dashboard: _dashboard(currencies: <CurrencyDashboard>[emptyCurrency]),
      ),
      size: const Size(360, 800),
    );

    expect(find.text('No member positions for this period.'), findsOneWidget);
    expect(find.text('No funds in this currency.'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('renders independent currency totals and present cash',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _dashboardSummary());

    expect(find.text('TWD'), findsWidgets);
    expect(find.text('USD'), findsWidgets);
    expect(find.text('Present cash'), findsNWidgets(2));
    expect(find.text('TWD 120,000'), findsWidgets);
    expect(find.text('USD 9,900'), findsOneWidget);
    expect(find.text('TWD 50,000'), findsOneWidget);
    expect(find.text('USD 2,000'), findsOneWidget);
  });

  testWidgets('switches scope locally without refetch or loading flash',
      (WidgetTester tester) async {
    var loads = 0;
    await _pumpDashboard(
      tester,
      summary: _dashboardSummary(),
      summaryLoader: () async {
        loads += 1;
        return _dashboardSummary();
      },
    );

    expect(loads, 1);
    expect(find.text('TWD 50,000'), findsOneWidget);
    await tester.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await tester.pump();

    expect(loads, 1);
    expect(find.byType(CircularProgressIndicator), findsNothing);
    expect(find.text('TWD 180,000'), findsOneWidget);
    expect(find.text('Former partner (Former member)'), findsOneWidget);
  });

  testWidgets('labels receivable payable and balanced positions',
      (WidgetTester tester) async {
    await _pumpDashboard(tester, summary: _dashboardSummary());

    expect(find.textContaining('Receivable +TWD 15,000'), findsOneWidget);
    expect(find.textContaining('Payable -TWD 15,000'), findsOneWidget);
    expect(find.textContaining('Balanced TWD 0'), findsOneWidget);
  });

  testWidgets('fund card navigates to the exact fund detail path',
      (WidgetTester tester) async {
    final router = await _pumpDashboard(tester, summary: _dashboardSummary());

    await tester.ensureVisible(find.text('Household'));
    final semantics = tester.getSemantics(
      find.byKey(const Key('dashboard-fund-fund-dashboard')),
    );
    expect(semantics.label, contains('Open Household'));
    expect(semantics.label, contains('Cash TWD 120,000'));
    expect(semantics.getSemanticsData().hasAction(SemanticsAction.tap), isTrue);
    await tester.tap(find.text('Household'));
    await tester.pumpAndSettle();

    expect(router.state.uri.path, AppRoutes.fundDetailPath('fund-dashboard'));
    expect(find.text('fund marker fund-dashboard'), findsOneWidget);
  });

  testWidgets('shows no-funds action when dashboard currencies are empty',
      (WidgetTester tester) async {
    await _pumpDashboard(
      tester,
      summary: _dashboardSummary(
        dashboard: _dashboard(currencies: const <CurrencyDashboard>[]),
      ),
    );

    expect(find.text('No funds yet'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Create fund'), findsOneWidget);
  });

  testWidgets('dashboard error keeps retry action and reloads provider',
      (WidgetTester tester) async {
    var attempts = 0;
    await _pumpDashboard(
      tester,
      summary: _dashboardSummary(),
      summaryLoader: () async {
        attempts += 1;
        if (attempts == 1) throw StateError('dashboard failed');
        return _dashboardSummary();
      },
    );

    expect(
        find.text('Unable to load your dashboard right now.'), findsOneWidget);
    await tester.tap(find.widgetWithText(ElevatedButton, 'Retry'));
    await tester.pumpAndSettle();
    expect(attempts, 2);
    expect(find.text('Present cash'), findsNWidgets(2));
  });

  testWidgets('large text dashboard wraps at 360 pixels and remains operable',
      (WidgetTester tester) async {
    final longCurrency = CurrencyDashboard(
      currency: 'LONG-CURRENCY-CODE',
      cashBalanceMinor: 9007199254740000,
      current: DashboardPeriodTotals(
        netChangeMinor: 123456789012345,
        contributionMinor: 9007199254740000,
        expenseMinor: 8883742465727655,
        memberPositions: const <DashboardMemberPosition>[
          DashboardMemberPosition(
            userId: 'long-user',
            displayName:
                'A very long member display name that must remain readable',
            membershipStatus: 'active',
            positionMinor: 123456789012345,
          ),
        ],
      ),
      allTime: DashboardPeriodTotals(
        netChangeMinor: 9007199254740000,
        contributionMinor: 9007199254740000,
        expenseMinor: 0,
        memberPositions: const <DashboardMemberPosition>[],
      ),
      funds: const <DashboardFundCard>[
        DashboardFundCard(
          fundId: 'long-fund',
          name:
              'A very long fund name that should wrap or use an understandable ellipsis',
          cashBalanceMinor: 9007199254740000,
          currentNetChangeMinor: 123456789012345,
          periodStart: null,
          periodEnd: null,
        ),
      ],
    );
    await _pumpDashboard(
      tester,
      summary: _dashboardSummary(
        dashboard: _dashboard(
          groupName:
              'A very long group name that should not overflow the viewport',
          currencies: <CurrencyDashboard>[longCurrency],
        ),
      ),
      size: const Size(360, 900),
      textScale: 2,
    );

    expect(find.text('LONG-CURRENCY-CODE'), findsWidgets);
    expect(tester.takeException(), isNull);
    await tester.ensureVisible(
      find.byKey(const Key('dashboard-scope-all-time')),
    );
    await tester.tap(find.byKey(const Key('dashboard-scope-all-time')));
    await tester.pump();
    expect(find.text('LONG-CURRENCY-CODE 9,007,199,254,740,000'), findsWidgets);
    expect(
      find.text('LONG-CURRENCY-CODE 8,883,742,465,727,655'),
      findsNothing,
    );
    expect(tester.takeException(), isNull);
  });

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

  testWidgets('shows current group context and member details',
      (WidgetTester tester) async {
    final router = await _pumpDashboard(tester, summary: _summary());

    expect(find.text('Current group'), findsOneWidget);
    expect(find.text('Our Home'), findsOneWidget);
    expect(find.byType(Chip), findsNothing);
    expect(find.text('Owner'), findsOneWidget);
    expect(find.text('2 members'), findsOneWidget);
    expect(find.text('View group'), findsOneWidget);
    expect(find.text('Members (2)'), findsOneWidget);
    expect(find.text('Edward'), findsNothing);
    expect(find.text('Alice'), findsNothing);

    await tester.tap(find.text('Members (2)'));
    await tester.pumpAndSettle();
    expect(find.text('Edward'), findsOneWidget);
    expect(find.text('Alice'), findsOneWidget);

    await tester.tap(find.text('View group'));
    await tester.pumpAndSettle();
    expect(find.text('group detail marker group-1'), findsOneWidget);
    router.pop();
    await tester.pumpAndSettle();
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
    expect(find.text('Create group'), findsOneWidget);
    expect(find.text('Current group'), findsNothing);

    await tester.tap(find.text('Create group'));
    await tester.pumpAndSettle();
    expect(find.text('create group marker'), findsOneWidget);
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
