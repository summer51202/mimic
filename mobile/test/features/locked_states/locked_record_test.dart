import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/corrections/presentation/create_correction_screen.dart';

void main() {
  testWidgets('shows locked record guidance and correction CTA', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateCorrectionScreen(fundId: 'fund-date'),
        ),
      ),
    );

    expect(find.text('Original record stays unchanged'), findsOneWidget);
    expect(
      find.textContaining('settled period is locked'),
      findsOneWidget,
    );
    expect(find.text('Save correction'), findsOneWidget);
  });
}
