import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';
import 'package:pairfund_mobile/features/invites/data/invite_repository.dart';
import 'package:pairfund_mobile/features/invites/presentation/create_invite_screen.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

final _invite = CreatedInvite(
  id: 'invite-1',
  code: 'ABC123456789',
  expiresAt: DateTime.utc(2026, 7, 23, 10, 30),
  invitedEmail: 'partner@example.com',
);

class _FakeInviteRepository implements InviteRepository {
  Future<CreatedInvite> Function(String, String?)? create;
  String? email;

  @override
  Future<CreatedInvite> createInvite(String groupId, {String? invitedEmail}) {
    email = invitedEmail;
    return create?.call(groupId, invitedEmail) ?? Future.value(_invite);
  }

  @override
  Future<AcceptedInvite> acceptInvite(String code) =>
      throw UnimplementedError();
}

Future<void> _pumpScreen(
  WidgetTester tester,
  _FakeInviteRepository repository,
) async {
  final router = GoRouter(
    initialLocation: AppRoutes.createInvitePath('group-1'),
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.createInvite,
        builder: (_, state) => CreateInviteScreen(
          groupId: state.pathParameters['groupId']!,
        ),
      ),
    ],
  );
  addTearDown(router.dispose);
  await tester.pumpWidget(
    ProviderScope(
      overrides: <Override>[
        inviteRepositoryProvider.overrideWithValue(repository),
      ],
      child: MaterialApp.router(routerConfig: router),
    ),
  );
  await tester.pump();
}

void main() {
  testWidgets('creates an invite for the entered optional email',
      (WidgetTester tester) async {
    final repository = _FakeInviteRepository();
    await _pumpScreen(tester, repository);

    await tester.enterText(find.byType(TextField), 'partner@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pumpAndSettle();

    expect(repository.email, 'partner@example.com');
    expect(find.text('ABC123456789'), findsOneWidget);
    expect(find.text('Copy code'), findsOneWidget);
    expect(find.textContaining('Jul 23, 2026'), findsOneWidget);
    expect(find.byType(SelectableText), findsWidgets);
  });

  testWidgets('blank optional email can be submitted',
      (WidgetTester tester) async {
    final repository = _FakeInviteRepository();
    await _pumpScreen(tester, repository);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pumpAndSettle();

    expect(repository.email, isNull);
    expect(find.text('ABC123456789'), findsOneWidget);
  });

  testWidgets('pending create disables action and shows progress',
      (WidgetTester tester) async {
    final completer = Completer<CreatedInvite>();
    final repository = _FakeInviteRepository()
      ..create = (_, __) => completer.future;
    await _pumpScreen(tester, repository);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pump();

    final button = find.widgetWithText(ElevatedButton, 'Create invite');
    expect(tester.widget<ElevatedButton>(button).onPressed, isNull);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    completer.complete(_invite);
    await tester.pumpAndSettle();
  });

  testWidgets('controller error is shown inline', (WidgetTester tester) async {
    final repository = _FakeInviteRepository()
      ..create = (_, __) async => throw const ApiException(
            code: 'GROUP_OWNER_REQUIRED',
            message: 'forbidden',
          );
    await _pumpScreen(tester, repository);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pumpAndSettle();

    expect(find.text('Only a group owner can invite members.'), findsOneWidget);
  });

  testWidgets('Copy code writes the generated code to the clipboard',
      (WidgetTester tester) async {
    String? copiedText;
    tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
      SystemChannels.platform,
      (call) async {
        if (call.method == 'Clipboard.setData') {
          copiedText =
              (call.arguments as Map<dynamic, dynamic>)['text'] as String?;
        }
        return null;
      },
    );
    addTearDown(() {
      tester.binding.defaultBinaryMessenger
          .setMockMethodCallHandler(SystemChannels.platform, null);
    });
    await _pumpScreen(tester, _FakeInviteRepository());
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create invite'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Copy code'));
    await tester.pump();

    expect(copiedText, 'ABC123456789');
  });
}
