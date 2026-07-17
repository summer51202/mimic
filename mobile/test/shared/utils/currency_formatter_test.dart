import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/utils/currency_formatter.dart';

void main() {
  test('formats two-decimal minor-unit currencies without double precision',
      () {
    expect(formatMinorCurrency(12345, currency: 'USD'), 'USD 123.45');
    expect(formatMinorCurrency(12345, currency: 'EUR'), 'EUR 123.45');
    expect(formatMinorCurrency(12345, currency: 'TWD'), 'TWD 123.45');
    expect(formatMinorCurrency(-12345, currency: 'USD'), 'USD -123.45');
    expect(formatMinorCurrency(9007199254740991, currency: 'USD'),
        'USD 90,071,992,547,409.91');
  });

  test('formats zero-decimal currencies', () {
    expect(formatMinorCurrency(12345, currency: 'JPY'), 'JPY 12,345');
    expect(formatMinorCurrency(-9, currency: 'JPY'), 'JPY -9');
  });
}
