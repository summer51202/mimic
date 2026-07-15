import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/contributions/presentation/create_contribution_screen.dart';

void main() {
  testWidgets('shows contribution form and action', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateContributionScreen(fundId: 'fund-date'),
        ),
      ),
    );

    expect(find.text('Add a contribution'), findsOneWidget);
    expect(find.text('Amount'), findsOneWidget);
    expect(find.text('Contribution type'), findsOneWidget);
    expect(find.text('Save contribution'), findsOneWidget);
  });
}
