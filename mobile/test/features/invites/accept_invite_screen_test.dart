import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/features/invites/data/invite_repository.dart';
import 'package:pairfund_mobile/features/invites/presentation/accept_invite_screen.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

final _accepted = AcceptedInvite(
  groupId: 'group-1',
  groupName: 'Our Home',
  role: 'member',
  joinedAt: DateTime.utc(2026, 7, 16),
);

const _homeSummary = HomeSummary(
  groupId: 'group-1',
  displayName: 'Edward',
  totalBalanceLabel: 'TWD 0',
  activeFunds: <FundSummary>[],
  recentActivities: <ActivityPreview>[],
  pendingTasksCount: 0,
);

class _FakeInviteRepository implements InviteRepository {
  Future<AcceptedInvite> Function(String)? accept;
  String? code;

  @override
  Future<AcceptedInvite> acceptInvite(String value) {
    code = value;
    return accept?.call(value) ?? Future.value(_accepted);
  }

  @override
  Future<CreatedInvite> createInvite(String groupId, {String? invitedEmail}) =>
      throw UnimplementedError();
}

Future<GoRouter> _pumpScreen(
  WidgetTester tester,
  _FakeInviteRepository repository,
) async {
  final router = GoRouter(
    initialLocation: AppRoutes.acceptInvite,
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.acceptInvite,
        builder: (_, __) => const AcceptInviteScreen(),
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
        inviteRepositoryProvider.overrideWithValue(repository),
        homeSummaryProvider.overrideWith((_) async => _homeSummary),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pump();
  return router;
}

void main() {
  testWidgets('joins group, shows success, and navigates home',
      (WidgetTester tester) async {
    final repository = _FakeInviteRepository();
    final router = await _pumpScreen(tester, repository);

    await tester.enterText(find.byType(TextField), 'ABC123456789');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Join group'));
    await tester.pump();
    await tester.pump();

    expect(repository.code, 'ABC123456789');
    expect(find.text('Joined Our Home'), findsOneWidget);
    expect(router.routeInformationProvider.value.uri.path, AppRoutes.home);
    expect(find.text('home marker'), findsOneWidget);
  });

  testWidgets('mapped invite error is shown inline',
      (WidgetTester tester) async {
    final repository = _FakeInviteRepository()
      ..accept = (_) async => throw const ApiException(
            code: 'INVITE_EXPIRED',
            message: 'expired',
          );
    await _pumpScreen(tester, repository);
    await tester.enterText(find.byType(TextField), 'ABC123456789');

    await tester.tap(find.widgetWithText(ElevatedButton, 'Join group'));
    await tester.pumpAndSettle();

    expect(find.text('This invite code has expired.'), findsOneWidget);
  });

  testWidgets('blank code shows validation without calling repository',
      (WidgetTester tester) async {
    final repository = _FakeInviteRepository();
    await _pumpScreen(tester, repository);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Join group'));
    await tester.pump();

    expect(repository.code, isNull);
    expect(find.text('Please enter an invite code.'), findsOneWidget);
  });

  testWidgets('pending join disables action and shows progress',
      (WidgetTester tester) async {
    final completer = Completer<AcceptedInvite>();
    final repository = _FakeInviteRepository()
      ..accept = (_) => completer.future;
    await _pumpScreen(tester, repository);
    await tester.enterText(find.byType(TextField), 'ABC123456789');

    await tester.tap(find.widgetWithText(ElevatedButton, 'Join group'));
    await tester.pump();

    final button = find.widgetWithText(ElevatedButton, 'Join group');
    expect(tester.widget<ElevatedButton>(button).onPressed, isNull);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    completer.complete(_accepted);
    await tester.pumpAndSettle();
  });
}
