import '../../../../shared/api/api_json.dart';
import '../../../home/data/group_dashboard.dart';
import '../fund_repository.dart';

FundDetailSummary mapFundSummaryResponse(Map<String, dynamic> response) {
  final data = readDataEnvelope(response);
  final fund = _map(data['fund'], 'fund');
  final period = _map(data['current_period'], 'current_period');
  return FundDetailSummary(
    fundId: _string(fund, 'id'),
    fundName: _string(fund, 'name'),
    currency: _string(fund, 'currency'),
    cashBalanceMinor: _integer(fund, 'cash_balance_minor'),
    periodStart: _date(period['period_start'], 'period_start'),
    periodEnd: _date(period['period_end'], 'period_end'),
    lastCompletedSettlementId: _nullableString(
        period['last_completed_settlement_id'], 'last_completed_settlement_id'),
    lastCompletedPeriodEnd:
        _date(period['last_completed_period_end'], 'last_completed_period_end'),
    current: _totals(_map(data['current'], 'current')),
    allTime: _totals(_map(data['all_time'], 'all_time')),
    recentActivity: const <FundActivityItem>[],
  );
}

DashboardPeriodTotals _totals(Map<String, dynamic> json) =>
    DashboardPeriodTotals(
      netChangeMinor: _integer(json, 'net_change_minor'),
      contributionMinor: _integer(json, 'contribution_minor'),
      expenseMinor: _integer(json, 'expense_minor'),
      memberPositions:
          _list(json['member_positions'], 'member_positions').map((item) {
        final value = _map(item, 'member_position');
        return DashboardMemberPosition(
            userId: _string(value, 'user_id'),
            displayName: _string(value, 'display_name'),
            membershipStatus: _string(value, 'membership_status'),
            positionMinor: _integer(value, 'position_minor'));
      }).toList(),
    );

FundActivityItem mapFundActivity(Map<String, dynamic> json,
    {required bool contribution}) {
  final title = contribution ? 'Contribution' : _string(json, 'title');
  final occurredOn = _requiredDate(json['occurred_on'], 'occurred_on');
  final amount = _integer(json, 'amount_minor');
  return FundActivityItem(
      type: contribution
          ? FundActivityType.contribution
          : FundActivityType.expense,
      title: title,
      occurredOn: occurredOn,
      amountMinor: amount);
}

extension FundDetailSummaryCopy on FundDetailSummary {
  FundDetailSummary withRecentActivity(List<FundActivityItem> value) =>
      FundDetailSummary(
          fundId: fundId,
          fundName: fundName,
          currency: currency,
          cashBalanceMinor: cashBalanceMinor,
          periodStart: periodStart,
          periodEnd: periodEnd,
          lastCompletedSettlementId: lastCompletedSettlementId,
          lastCompletedPeriodEnd: lastCompletedPeriodEnd,
          current: current,
          allTime: allTime,
          recentActivity: value);
}

Map<String, dynamic> _map(Object? value, String field) {
  if (value is Map<String, dynamic>) return value;
  throw FormatException('$field must be an object');
}

List<dynamic> _list(Object? value, String field) {
  if (value is List) return value;
  throw FormatException('$field must be a list');
}

String _string(Map<String, dynamic> json, String field) {
  final value = json[field];
  if (value is String && value.trim().isNotEmpty) return value;
  throw FormatException('$field must be a non-empty string');
}

String? _nullableString(Object? value, String field) {
  if (value == null) return null;
  if (value is String && value.trim().isNotEmpty) return value;
  throw FormatException('$field must be a non-empty string or null');
}

int _integer(Map<String, dynamic> json, String field,
    {bool missingAsZero = false}) {
  if (!json.containsKey(field) && missingAsZero) return 0;
  final value = json[field];
  if (value is int) return value;
  throw FormatException('$field must be an integer');
}

DateTime? _date(Object? value, String field) {
  if (value == null) return null;
  if (value is! String) {
    throw FormatException('$field must be a date string or null');
  }
  final dateOnly = RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value);
  final zoned = RegExp(r'(Z|[+-]\d{2}:\d{2})$').hasMatch(value);
  if (!dateOnly && !zoned) {
    throw FormatException('$field must include a timezone');
  }
  final parsed = DateTime.tryParse(dateOnly ? '${value}T00:00:00Z' : value);
  if (parsed == null) throw FormatException('$field must be a valid date');
  return parsed.toUtc();
}

DateTime _requiredDate(Object? value, String field) {
  final parsed = _date(value, field);
  if (parsed == null) throw FormatException('$field must be a date');
  return parsed;
}
