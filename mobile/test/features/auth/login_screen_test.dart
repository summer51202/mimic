import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets('shows login actions', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('mimic'), findsOneWidget);
    expect(
      find.text('一起存，一起花，一起在異世界探險吧!'),
      findsOneWidget,
    );
    expect(find.text('PairFund'), findsNothing);
    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);

    final email = tester.widget<TextField>(
      find.byKey(const Key('auth-email')),
    );
    final password = tester.widget<TextField>(
      find.byKey(const Key('auth-password')),
    );
    expect(email.controller?.text, isEmpty);
    expect(password.controller?.text, isEmpty);
    expect(email.decoration?.hintText, 'you@example.com');
    expect(password.decoration?.hintText, 'At least 6 characters');
    expect(find.text('Use demo account'), findsOneWidget);
  });

  testWidgets('demo action fills credentials only when requested',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: LoginScreen())),
    );

    await tester.tap(find.text('Use demo account'));
    await tester.pump();

    expect(
      tester
          .widget<TextField>(find.byKey(const Key('auth-email')))
          .controller
          ?.text,
      'demo@pairfund.local',
    );
    expect(
      tester
          .widget<TextField>(find.byKey(const Key('auth-password')))
          .controller
          ?.text,
      'password',
    );
  });

  testWidgets('switches between sign in and create account modes',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    await tester.tap(find.text('Create account'));
    await tester.pump();

    expect(find.text('Display name'), findsOneWidget);
    expect(find.text('Already have an account? Sign in'), findsOneWidget);

    await tester.tap(find.text('Already have an account? Sign in'));
    await tester.pump();

    expect(find.text('Display name'), findsNothing);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('registration validates fields and clears corrected errors',
      (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: MaterialApp(home: LoginScreen())),
    );
    await tester.tap(find.text('Create account'));
    await tester.pump();

    await tester.enterText(
      find.byKey(const Key('auth-email')),
      'not-an-email',
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'test',
    );
    await tester.tap(find.widgetWithText(ElevatedButton, 'Create account'));
    await tester.pump();

    expect(find.text('Display name is required.'), findsOneWidget);
    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(
        find.text('Password must be at least 6 characters.'), findsOneWidget);

    await tester.enterText(
      find.byKey(const Key('auth-display-name')),
      'Taylor',
    );
    await tester.enterText(
      find.byKey(const Key('auth-email')),
      'taylor@example.com',
    );
    await tester.enterText(
      find.byKey(const Key('auth-password')),
      'test123',
    );
    await tester.pump();

    expect(find.text('Display name is required.'), findsNothing);
    expect(find.text('Enter a valid email address.'), findsNothing);
    expect(find.text('Password must be at least 6 characters.'), findsNothing);
  });
}
