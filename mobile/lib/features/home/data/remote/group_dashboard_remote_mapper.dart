import '../../../../shared/api/api_json.dart';
import '../group_dashboard.dart';

GroupDashboard mapGroupDashboardResponse(Map<String, dynamic> response) {
  final data = readDataEnvelope(response);
  final group = _map(data['group'], 'group');
  final currencies = _list(data['currencies'], 'currencies')
      .map((item) => _currency(_map(item, 'currency')))
      .toList();
  return GroupDashboard(
    groupId: _requiredString(group, 'id'),
    groupName: _requiredString(group, 'name'),
    defaultCurrency: _requiredString(group, 'default_currency'),
    currencies: currencies,
  );
}

CurrencyDashboard _currency(Map<String, dynamic> json) => CurrencyDashboard(
      currency: _requiredString(json, 'currency'),
      cashBalanceMinor: _number(json, 'cash_balance_minor'),
      current: _totals(_map(json['current'], 'current')),
      allTime: _totals(_map(json['all_time'], 'all_time')),
      funds: _list(json['funds'], 'funds')
          .map((item) => _fund(_map(item, 'fund')))
          .toList(),
    );

DashboardPeriodTotals _totals(Map<String, dynamic> json) => DashboardPeriodTotals(
      netChangeMinor: _number(json, 'net_change_minor', missingAsZero: true),
      contributionMinor: _number(json, 'contribution_minor', missingAsZero: true),
      expenseMinor: _number(json, 'expense_minor', missingAsZero: true),
      memberPositions: json['member_positions'] == null
          ? <DashboardMemberPosition>[]
          : _list(json['member_positions'], 'member_positions')
              .map((item) => _member(_map(item, 'member_position')))
              .toList(),
    );

DashboardMemberPosition _member(Map<String, dynamic> json) => DashboardMemberPosition(
      userId: _requiredString(json, 'user_id'),
      displayName: _requiredString(json, 'display_name'),
      membershipStatus: _requiredString(json, 'membership_status'),
      positionMinor: _number(json, 'position_minor'),
    );

DashboardFundCard _fund(Map<String, dynamic> json) => DashboardFundCard(
      fundId: _requiredString(json, 'fund_id'),
      name: _requiredString(json, 'name'),
      cashBalanceMinor: _number(json, 'cash_balance_minor'),
      currentNetChangeMinor: _number(json, 'current_net_change_minor'),
      periodStart: _date(json['period_start'], 'period_start'),
      periodEnd: _date(json['period_end'], 'period_end'),
    );

Map<String, dynamic> _map(Object? value, String field) {
  if (value is Map<String, dynamic>) return value;
  throw FormatException('$field must be an object');
}

List<dynamic> _list(Object? value, String field) {
  if (value is List) return value;
  throw FormatException('$field must be a list');
}

String _requiredString(Map<String, dynamic> json, String field) {
  final value = json[field];
  if (value is String && value.trim().isNotEmpty) return value;
  throw FormatException('$field must be a non-empty string');
}

int _number(Map<String, dynamic> json, String field, {bool missingAsZero = false}) {
  if (!json.containsKey(field) && missingAsZero) return 0;
  final value = json[field];
  if (value is int) return value;
  throw FormatException('$field must be an integer');
}

DateTime? _date(Object? value, String field) {
  if (value == null) return null;
  if (value is! String) throw FormatException('$field must be a date string or null');
  final parsed = DateTime.tryParse(value);
  if (parsed == null) throw FormatException('$field must be a valid date');
  return parsed.toUtc();
}
