import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:pairfund_mobile/features/home/presentation/home_dashboard_screen.dart';

void main() {
  testWidgets('renders shared balance and quick actions', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: HomeDashboardScreen(),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('Our shared funds'), findsOneWidget);
    expect(find.text('Add expense'), findsOneWidget);
    expect(find.text('Settle'), findsOneWidget);
    expect(find.text('Pending tasks'), findsOneWidget);
  });
}
