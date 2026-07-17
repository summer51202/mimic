import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/groups/data/group_repository.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/presentation/group_detail_screen.dart';
import 'package:pairfund_mobile/features/groups/providers/group_detail_controller.dart';

const _ownerDetail = GroupDetail(
  id: 'group-1',
  name: 'Our Home',
  groupType: 'couple',
  defaultCurrency: 'TWD',
  role: 'owner',
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

  @override
  Future<GroupDetail> fetchGroup(String groupId) async => _ownerDetail;

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
  ) async {}

  @override
  Future<void> removeMember(String groupId, String userId) async {}

  @override
  Future<void> leaveGroup(String groupId) async {}
}

Future<GoRouter> _pump(
  WidgetTester tester,
  GroupDetail detail, {
  Size size = const Size(390, 844),
  GroupRepository? repository,
}) async {
  await tester.binding.setSurfaceSize(size);
  addTearDown(() => tester.binding.setSurfaceSize(null));
  final router = GoRouter(
    initialLocation: AppRoutes.groupDetailPath('group-1'),
    routes: [
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
        groupDetailProvider('group-1').overrideWith((_) async => detail),
        if (repository != null)
          groupRepositoryProvider.overrideWithValue(repository),
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
}
