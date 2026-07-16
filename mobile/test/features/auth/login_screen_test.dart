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

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Continue'), findsOneWidget);
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
}
