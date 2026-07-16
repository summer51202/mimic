import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/groups/data/group_creation_repository.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/groups/presentation/create_group_screen.dart';

class _FakeRepository implements GroupCreationRepository {
  CreateGroupDraft? draft;

  @override
  Future<CreatedGroup> createGroup(CreateGroupDraft draft) async {
    this.draft = draft;
    return CreatedGroup(
      id: 'group-created',
      name: draft.name,
      groupType: draft.groupType,
      defaultCurrency: draft.defaultCurrency,
    );
  }
}

class _MemoryPersistence implements SelectedGroupPersistence {
  @override
  Future<void> clear() async {}
  @override
  Future<String?> read() async => null;
  @override
  Future<void> write(String groupId) async {}
}

void main() {
  testWidgets('creates a group and returns home', (tester) async {
    final repository = _FakeRepository();
    final router = GoRouter(
      initialLocation: AppRoutes.createGroup,
      routes: <RouteBase>[
        GoRoute(
          path: AppRoutes.createGroup,
          builder: (_, __) => const CreateGroupScreen(),
        ),
        GoRoute(
          path: AppRoutes.home,
          builder: (_, __) => const Scaffold(body: Text('home marker')),
        ),
      ],
    );
    addTearDown(router.dispose);

    await tester.pumpWidget(
      ProviderScope(
        overrides: <Override>[
          groupCreationRepositoryProvider.overrideWithValue(repository),
          selectedGroupPersistenceProvider
              .overrideWithValue(_MemoryPersistence()),
        ],
        child: MaterialApp.router(routerConfig: router),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Create group'), findsWidgets);
    expect(find.text('Group name'), findsOneWidget);
    expect(find.text('Group type'), findsOneWidget);
    await tester.enterText(find.byType(TextField), 'Summer Trip');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create group'));
    await tester.pumpAndSettle();

    expect(repository.draft?.name, 'Summer Trip');
    expect(find.text('home marker'), findsOneWidget);
  });
}
