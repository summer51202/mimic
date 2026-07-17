import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/presentation/group_detail_screen.dart';
import 'package:pairfund_mobile/features/groups/providers/group_detail_controller.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

const _ownerDetail = GroupDetail(
  id: 'group-1',
  name: 'Our Home',
  groupType: 'couple',
  defaultCurrency: 'TWD',
  role: 'owner',
  currentUserId: 'user-1',
  members: [
    GroupMemberSummary(id: 'user-1', displayName: 'Edward', role: 'owner'),
    GroupMemberSummary(id: 'user-2', displayName: 'Alice', role: 'member'),
  ],
  funds: [
    GroupFundSummary(
      id: 'fund-1',
      name: 'Date Fund',
      balanceLabel: 'TWD 6,400',
    ),
  ],
);

class _RenameRepository implements GroupRepository {
  String? renamedTo;
  GroupDetail detail = _ownerDetail;
  Object? mutationError;
  Completer<void>? mutationGate;
  int leaveCalls = 0;
  int removeCalls = 0;

  @override
  Future<GroupDetail> fetchGroup(String groupId) async => detail;

  @override
  Future<RenamedGroup> renameGroup(String groupId, String name) async {
    renamedTo = name;
    return RenamedGroup(id: groupId, name: name);
  }

  @override
  Future<void> updateMemberRole(
    String groupId,
    String userId,
    String role,
  ) async {
    if (mutationGate != null) await mutationGate!.future;
    if (mutationError != null) throw mutationError!;
    detail = GroupDetail(
      id: detail.id,
      name: detail.name,
      groupType: detail.groupType,
      defaultCurrency: detail.defaultCurrency,
      role: detail.role,
      currentUserId: detail.currentUserId,
      members: detail.members
          .map((member) => member.id == userId
              ? GroupMemberSummary(
                  id: member.id,
                  displayName: member.displayName,
                  role: role,
                )
              : member)
          .toList(),
      funds: detail.funds,
    );
  }

  @override
  Future<void> removeMember(String groupId, String userId) async {
    removeCalls++;
    if (mutationGate != null) await mutationGate!.future;
    if (mutationError != null) throw mutationError!;
    detail = GroupDetail(
      id: detail.id,
      name: detail.name,
      groupType: detail.groupType,
      defaultCurrency: detail.defaultCurrency,
      role: detail.role,
      currentUserId: detail.currentUserId,
      members: detail.members.where((member) => member.id != userId).toList(),
      funds: detail.funds,
    );
  }

  @override
  Future<void> leaveGroup(String groupId) async {
    leaveCalls++;
    if (mutationError != null) throw mutationError!;
  }
}

Future<GoRouter> _pump(
  WidgetTester tester,
  GroupDetail detail, {
  Size size = const Size(390, 844),
  GroupRepository? repository,
  Future<List<GroupSummary>> Function()? loadHomeGroups,
}) async {
  await tester.binding.setSurfaceSize(size);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    initialLocation: AppRoutes.groupDetailPath('group-1'),
    routes: [
      GoRoute(
        path: AppRoutes.home,
        builder: (_, __) => const Scaffold(body: Text('home marker')),
      ),
      GoRoute(
        path: AppRoutes.groupDetail,
        builder: (_, state) => GroupDetailScreen(
          groupId: state.pathParameters['groupId']!,
        ),
      ),
      GoRoute(
        path: AppRoutes.createInvite,
        name: 'create-invite',
        builder: (_, __) => const Scaffold(body: Text('invite marker')),
      ),
      GoRoute(
        path: AppRoutes.fundDetail,
        builder: (_, __) => const Scaffold(body: Text('fund marker')),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        if (repository == null)
          groupDetailProvider('group-1').overrideWith((_) async => detail),
        if (repository != null)
          groupRepositoryProvider.overrideWithValue(repository),
        if (loadHomeGroups != null)
          homeGroupsProvider.overrideWith((_) => loadHomeGroups()),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pumpAndSettle();
  return router;
}

void main() {
  testWidgets('owner sees identity members funds and management actions',
      (tester) async {
    await _pump(tester, _ownerDetail);

    expect(find.text('Our Home'), findsWidgets);
    expect(find.text('Owner'), findsWidgets);
    expect(find.text('Edward'), findsOneWidget);
    expect(find.text('Alice'), findsOneWidget);
    expect(find.text('Date Fund'), findsOneWidget);
    expect(find.text('Rename group'), findsOneWidget);
    expect(find.text('Invite member'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('member does not see owner management actions', (tester) async {
    await _pump(
        tester,
        const GroupDetail(
          id: 'group-1',
          name: 'Our Home',
          groupType: 'couple',
          defaultCurrency: 'TWD',
          role: 'member',
          members: [],
          funds: [],
        ));

    expect(find.text('Member'), findsOneWidget);
    expect(find.text('Rename group'), findsNothing);
    expect(find.text('Invite member'), findsNothing);
    expect(find.text('No funds yet'), findsOneWidget);
  });

  testWidgets('owner invite and fund rows navigate with exact ids',
      (tester) async {
    final router = await _pump(tester, _ownerDetail);

    await tester.tap(find.text('Invite member'));
    await tester.pumpAndSettle();
    expect(router.state.uri.path, '/groups/group-1/invites/new');
    router.go(AppRoutes.groupDetailPath('group-1'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Date Fund'));
    await tester.pumpAndSettle();
    expect(router.state.uri.path, '/funds/fund-1');
  });

  testWidgets('owner rename dialog submits the edited name', (tester) async {
    final repository = _RenameRepository();
    await _pump(tester, _ownerDetail, repository: repository);

    await tester.tap(find.text('Rename group'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextFormField), 'Renamed Home');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pumpAndSettle();

    expect(repository.renamedTo, 'Renamed Home');
    expect(find.byType(AlertDialog), findsNothing);
  });

  testWidgets('owner manages another member but never the current user',
      (tester) async {
    await _pump(tester, _ownerDetail);

    expect(find.byKey(const Key('member-actions-user-1')), findsNothing);
    expect(find.byKey(const Key('member-actions-user-2')), findsOneWidget);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();

    expect(find.text('Make Owner'), findsOneWidget);
    expect(find.text('Remove member'), findsOneWidget);
  });

  testWidgets('member has no member menus and sees leave danger zone',
      (tester) async {
    await _pump(
      tester,
      const GroupDetail(
        id: 'group-1',
        name: 'Our Home',
        groupType: 'couple',
        defaultCurrency: 'TWD',
        role: 'member',
        currentUserId: 'user-2',
        members: [
          GroupMemberSummary(
              id: 'user-1', displayName: 'Edward', role: 'owner'),
          GroupMemberSummary(
              id: 'user-2', displayName: 'Alice', role: 'member'),
        ],
        funds: [],
      ),
    );

    expect(find.byIcon(Icons.more_vert), findsNothing);
    expect(find.text('Danger zone'), findsOneWidget);
    expect(find.text('Leave group'), findsOneWidget);
    final dangerText = tester.widget<Text>(find.text('Danger zone'));
    final colors =
        Theme.of(tester.element(find.text('Danger zone'))).colorScheme;
    expect(dangerText.style?.color, colors.error);
    final semantics = tester.getSemantics(find.text('Danger zone'));
    expect(semantics.flagsCollection.isHeader, isTrue);
  });

  testWidgets('member action asks for confirmation with target name',
      (tester) async {
    await _pump(tester, _ownerDetail);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove member'));
    await tester.pumpAndSettle();

    expect(find.byType(AlertDialog), findsOneWidget);
    expect(find.textContaining('Alice'), findsWidgets);
    final remove = tester.widget<FilledButton>(
      find.widgetWithText(FilledButton, 'Remove'),
    );
    final removeColors =
        Theme.of(tester.element(find.byType(AlertDialog))).colorScheme;
    expect(remove.style!.backgroundColor!.resolve(<WidgetState>{}),
        removeColors.error);
    expect(remove.style!.foregroundColor!.resolve(<WidgetState>{}),
        removeColors.onError);
  });

  testWidgets('owner can demote another owner with consequence copy',
      (tester) async {
    const detail = GroupDetail(
      id: 'group-1',
      name: 'Our Home',
      groupType: 'group',
      defaultCurrency: 'TWD',
      role: 'owner',
      currentUserId: 'user-1',
      members: [
        GroupMemberSummary(id: 'user-1', displayName: 'Edward', role: 'owner'),
        GroupMemberSummary(id: 'user-2', displayName: 'Alice', role: 'owner'),
      ],
      funds: [],
    );
    await _pump(tester, detail);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    expect(find.text('Make Member'), findsOneWidget);
    await tester.tap(find.text('Make Member'));
    await tester.pumpAndSettle();
    expect(find.text('Make Member Alice?'), findsOneWidget);
    expect(find.textContaining('no longer be able to manage'), findsOneWidget);
  });

  testWidgets('promote confirmation succeeds, refreshes member, and snacks',
      (tester) async {
    final repository = _RenameRepository();
    await _pump(tester, _ownerDetail, repository: repository);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make Owner'));
    await tester.pumpAndSettle();
    expect(find.text('Make Owner Alice?'), findsOneWidget);
    expect(find.textContaining('manage members'), findsOneWidget);
    await tester.tap(find.widgetWithText(FilledButton, 'Make Owner'));
    await tester.pumpAndSettle();
    expect(find.text('Make Owner completed.'), findsOneWidget);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    expect(find.text('Make Member'), findsOneWidget);
  });

  testWidgets(
      'submitting disables member controls and prevents duplicate calls',
      (tester) async {
    final repository = _RenameRepository()..mutationGate = Completer<void>();
    await _pump(tester, _ownerDetail, repository: repository);
    final container = ProviderScope.containerOf(
      tester.element(find.byType(GroupDetailScreen)),
    );
    final notifier = container.read(
      groupMemberMutationControllerProvider('group-1').notifier,
    );
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove member'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
    final duplicate = notifier.remove('user-2');
    await tester.pump();
    expect(await duplicate, isFalse);
    expect(repository.removeCalls, 1);
    expect(find.byKey(const Key('member-actions-user-2')), findsNothing);
    repository.mutationGate!.complete();
    await tester.pumpAndSettle();
  });

  testWidgets('friendly domain error is shown without raw backend copy',
      (tester) async {
    final repository = _RenameRepository()
      ..mutationError = const ApiException(
        code: 'MEMBER_HAS_OPEN_BALANCE',
        message: 'raw backend',
      );
    await _pump(tester, _ownerDetail, repository: repository);
    await tester.tap(find.byKey(const Key('member-actions-user-2')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove member'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Remove'));
    await tester.pumpAndSettle();
    expect(find.text("Complete this member's balances in every fund first."),
        findsOneWidget);
    expect(find.text('raw backend'), findsNothing);
  });

  testWidgets('leave confirms destructive action and navigates after sync',
      (tester) async {
    final repository = _RenameRepository();
    final router = await _pump(
      tester,
      _ownerDetail,
      repository: repository,
      loadHomeGroups: () async => const <GroupSummary>[],
    );
    await tester.tap(find.text('Leave group'));
    await tester.pumpAndSettle();
    expect(find.text('Leave group?'), findsOneWidget);
    final leave = tester
        .widget<FilledButton>(find.widgetWithText(FilledButton, 'Leave group'));
    final leaveColors =
        Theme.of(tester.element(find.byType(AlertDialog))).colorScheme;
    expect(leave.style!.backgroundColor!.resolve(<WidgetState>{}),
        leaveColors.error);
    expect(leave.style!.foregroundColor!.resolve(<WidgetState>{}),
        leaveColors.onError);
    await tester.tap(find.widgetWithText(FilledButton, 'Leave group'));
    await tester.pumpAndSettle();
    expect(repository.leaveCalls, 1);
    expect(router.state.uri.path, AppRoutes.home);
  });

  testWidgets('leave sync failure keeps screen and shows recovery guidance',
      (tester) async {
    final repository = _RenameRepository();
    final router = await _pump(
      tester,
      _ownerDetail,
      repository: repository,
      loadHomeGroups: () async => throw StateError('refresh failed'),
    );
    await tester.tap(find.text('Leave group'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(FilledButton, 'Leave group'));
    await tester.pumpAndSettle();
    expect(repository.leaveCalls, 1);
    expect(router.state.uri.path, AppRoutes.groupDetailPath('group-1'));
    expect(find.textContaining('could not refresh'), findsOneWidget);
  });

  testWidgets('compact group details render without overflow', (tester) async {
    await _pump(tester, _ownerDetail, size: const Size(320, 700));
    expect(tester.takeException(), isNull);
  });
}
