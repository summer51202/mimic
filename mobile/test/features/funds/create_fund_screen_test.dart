import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/funds/presentation/create_fund_screen.dart';

void main() {
  testWidgets('shows create fund form and action', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateFundScreen(),
        ),
      ),
    );

    expect(find.text('Create your first shared fund'), findsOneWidget);
    expect(find.text('Fund name'), findsOneWidget);
    expect(find.text('Create fund'), findsWidgets);
  });
}
