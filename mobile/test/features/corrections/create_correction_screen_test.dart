import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/corrections/presentation/create_correction_screen.dart';

void main() {
  testWidgets('shows correction form fields', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CreateCorrectionScreen(fundId: 'fund-1'),
        ),
      ),
    );

    expect(find.text('Correction title'), findsOneWidget);
    expect(find.text('Amount'), findsOneWidget);
    expect(find.text('Save correction'), findsOneWidget);
  });
}
