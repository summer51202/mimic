String formatMinorCurrency(
  int amountMinor, {
  String currency = 'TWD',
}) {
  final normalized = currency.toUpperCase();
  final negative = amountMinor < 0;
  final absolute = amountMinor.abs();
  final divisor = normalized == 'JPY' ? 1 : 100;
  final whole = absolute ~/ divisor;
  final groupedWhole = _groupDigits(whole.toString());
  if (normalized == 'JPY') {
    return '$normalized ${negative ? '-' : ''}$groupedWhole';
  }
  final fraction = (absolute % 100).toString().padLeft(2, '0');
  return '$normalized ${negative ? '-' : ''}$groupedWhole.$fraction';
}

String _groupDigits(String digits) {
  final firstGroupLength = digits.length % 3;
  final parts = <String>[];
  var offset = 0;
  if (firstGroupLength != 0) {
    parts.add(digits.substring(0, firstGroupLength));
    offset = firstGroupLength;
  }
  while (offset < digits.length) {
    parts.add(digits.substring(offset, offset + 3));
    offset += 3;
  }
  return parts.join(',');
}
