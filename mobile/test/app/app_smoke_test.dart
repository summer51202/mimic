import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/app/app.dart';
import 'package:pairfund_mobile/app/router/app_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/providers/selected_group_provider.dart';
import 'package:pairfund_mobile/features/invites/data/invite_repository.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/storage/session_persistence.dart';

class FakeSessionNotifier extends SessionNotifier {
  FakeSessionNotifier(SessionState initialState) : super() {
    state = initialState;
  }
}

class FakeSessionPersistence implements SessionPersistence {
  FakeSessionPersistence(this._session);

  final SessionState? _session;

  @override
  Future<void> clearSession() async {}

  @override
  Future<SessionState?> readSession() async {
    return _session;
  }

  @override
  Future<void> saveSession(SessionState session) async {}
}

class FakeSelectedGroupPersistence implements SelectedGroupPersistence {
  FakeSelectedGroupPersistence({this.value = 'group-1'});
  String? value;
  @override
  Future<void> clear() async => value = null;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String groupId) async => value = groupId;
}

const _authenticatedSession = SessionState(
  accessToken: 'token',
  refreshToken: 'refresh',
  userId: 'user-1',
);

const _homeSummary = HomeSummary(
  groupId: 'group-1',
  displayName: 'Edward',
  totalBalanceLabel: 'TWD 0',
  activeFunds: <FundSummary>[],
  recentActivities: <ActivityPreview>[],
  pendingTasksCount: 0,
);

class FakeInviteRepository implements InviteRepository {
  String? receivedGroupId;

  @override
  Future<CreatedInvite> createInvite(
    String groupId, {
    String? invitedEmail,
  }) async {
    receivedGroupId = groupId;
    return CreatedInvite(
      id: 'invite-1',
      code: 'ABC123456789',
      expiresAt: DateTime.utc(2026, 7, 23, 10, 30),
      invitedEmail: invitedEmail,
    );
  }

  @override
  Future<AcceptedInvite> acceptInvite(String code) =>
      throw UnimplementedError();
}

class FakeGovernanceRepository implements GroupRepository {
  int leaveCalls = 0;
  @override
  Future<GroupDetail> fetchGroup(String groupId) async => const GroupDetail(
        id: 'group-1',
        name: 'Our Home',
        groupType: 'couple',
        defaultCurrency: 'TWD',
        role: 'owner',
        currentUserId: 'user-1',
        members: [
          GroupMemberSummary(
              id: 'user-1', displayName: 'Edward', role: 'owner'),
          GroupMemberSummary(
              id: 'user-2', displayName: 'Alice', role: 'member'),
        ],
        funds: [],
      );
  @override
  Future<void> leaveGroup(String groupId) async => leaveCalls++;
  @override
  Future<void> removeMember(String groupId, String userId) async {}
  @override
  Future<RenamedGroup> renameGroup(String groupId, String name) async =>
      RenamedGroup(id: groupId, name: name);
  @override
  Future<void> updateMemberRole(
      String groupId, String userId, String role) async {}
}

class FakeGovernanceHomeRepository implements HomeRepository {
  FakeGovernanceHomeRepository(this.governance);
  final FakeGovernanceRepository governance;

  @override
  Future<List<GroupSummary>> fetchGroups() async {
    if (governance.leaveCalls > 0) return const <GroupSummary>[];
    return const <GroupSummary>[
      GroupSummary(
        id: 'group-1',
        name: 'Our Home',
        groupType: 'COUPLE',
        memberCount: 2,
        role: 'OWNER',
      ),
    ];
  }

  @override
  Future<HomeSummary> fetchSummary({required String? groupId}) async =>
      _homeSummary;
}

ProviderContainer _authenticatedContainer({
  InviteRepository? inviteRepository,
  GroupRepository? groupRepository,
  HomeRepository? homeRepository,
  SelectedGroupPersistence? selectedGroupPersistence,
  bool useFormalHomeGroups = false,
}) {
  return ProviderContainer(
    overrides: <Override>[
      sessionProvider.overrideWith(
        (ref) => FakeSessionNotifier(_authenticatedSession),
      ),
      homeSummaryProvider.overrideWith((_) async => _homeSummary),
      if (!useFormalHomeGroups)
        homeGroupsProvider.overrideWith(
          (_) async => const <GroupSummary>[
            GroupSummary(
              id: 'group-1',
              name: 'Our Home',
              groupType: 'COUPLE',
              memberCount: 2,
              role: 'OWNER',
            ),
          ],
        ),
      selectedGroupProvider.overrideWith(
        (_) => SelectedGroupNotifier(
          selectedGroupPersistence ?? FakeSelectedGroupPersistence(),
        ),
      ),
      if (inviteRepository != null)
        inviteRepositoryProvider.overrideWithValue(inviteRepository),
      if (groupRepository != null)
        groupRepositoryProvider.overrideWithValue(groupRepository),
      if (homeRepository != null)
        homeRepositoryProvider.overrideWithValue(homeRepository),
    ],
  );
}

Future<void> _pumpProductionRouter(
  WidgetTester tester,
  ProviderContainer container,
) async {
  final router = container.read(appRouterProvider);
  addTearDown(() {
    router.dispose();
    container.dispose();
  });
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('renders auth-first app shell for signed-out users', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(null),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('PairFund'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('redirects authenticated users to home', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(null),
          ),
          sessionProvider.overrideWith(
            (ref) => FakeSessionNotifier(
              const SessionState(
                accessToken: 'token',
                refreshToken: 'refresh',
                userId: 'user-1',
              ),
            ),
          ),
          homeGroupsProvider.overrideWith((_) async => const <GroupSummary>[]),
          selectedGroupProvider.overrideWith(
            (_) => SelectedGroupNotifier(FakeSelectedGroupPersistence()),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Our shared funds'), findsOneWidget);
  });

  testWidgets('restores persisted session on app startup', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          sessionPersistenceProvider.overrideWithValue(
            FakeSessionPersistence(
              const SessionState(
                accessToken: 'persisted-token',
                refreshToken: 'persisted-refresh',
                userId: 'user-1',
              ),
            ),
          ),
          homeGroupsProvider.overrideWith((_) async => const <GroupSummary>[]),
          selectedGroupProvider.overrideWith(
            (_) => SelectedGroupNotifier(FakeSelectedGroupPersistence()),
          ),
        ],
        child: const PairFundApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Our shared funds'), findsOneWidget);
  });

  testWidgets('production router renders accept invite for authenticated users',
      (WidgetTester tester) async {
    final container = _authenticatedContainer();
    await _pumpProductionRouter(tester, container);
    final router = container.read(appRouterProvider);

    router.go(AppRoutes.acceptInvite);
    await tester.pumpAndSettle();

    expect(find.text('Enter invite code'), findsOneWidget);
    expect(find.text('Join group'), findsOneWidget);
  });

  testWidgets('production create invite route wires the group id',
      (WidgetTester tester) async {
    final repository = FakeInviteRepository();
    final container = _authenticatedContainer(inviteRepository: repository);
    await _pumpProductionRouter(tester, container);
    final router = container.read(appRouterProvider);

    router.pushNamed(
      'create-invite',
      pathParameters: const <String, String>{'groupId': 'group-1'},
    );
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField), 'partner@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pumpAndSettle();

    expect(repository.receivedGroupId, 'group-1');
    expect(find.text('ABC123456789'), findsOneWidget);
  });

  testWidgets(
      'production governance leave waits for reconciliation then goes home',
      (WidgetTester tester) async {
    final repository = FakeGovernanceRepository();
    final persistence = FakeSelectedGroupPersistence();
    final container = _authenticatedContainer(
      groupRepository: repository,
      homeRepository: FakeGovernanceHomeRepository(repository),
      selectedGroupPersistence: persistence,
      useFormalHomeGroups: true,
    );
    await _pumpProductionRouter(tester, container);
    final router = container.read(appRouterProvider);
    await container.read(homeGroupsProvider.future);
    expect(container.read(selectedGroupProvider), 'group-1');
    expect(persistence.value, 'group-1');
    router.go(AppRoutes.groupDetailPath('group-1'));
    await tester.pumpAndSettle();
    final leaveButton = find.byKey(const Key('leave-group-button'));
    await tester.drag(find.byType(ListView), const Offset(0, -300));
    await tester.pumpAndSettle();
    await tester.tap(leaveButton);
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Leave group'));
    await tester.pumpAndSettle();
    expect(repository.leaveCalls, 1);
    expect(container.read(selectedGroupProvider), isNull);
    expect(persistence.value, isNull);
    expect(router.state.uri.path, AppRoutes.home);
  });
}
