import 'package:intl/intl.dart';

String formatMinorCurrency(
  int amountMinor, {
  String currency = 'TWD',
}) {
  final formatter = NumberFormat.decimalPattern();
  return '$currency ${formatter.format(amountMinor)}';
}
