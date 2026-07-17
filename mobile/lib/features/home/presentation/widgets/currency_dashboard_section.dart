import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../../../shared/constants/design_tokens.dart';
import '../../../../shared/utils/currency_formatter.dart';
import '../../data/group_dashboard.dart';

class CurrencyDashboardSection extends StatelessWidget {
  const CurrencyDashboardSection({
    super.key,
    required this.dashboard,
    required this.scope,
    required this.onFundTap,
  });

  final CurrencyDashboard dashboard;
  final DashboardScope scope;
  final ValueChanged<String> onFundTap;

  @override
  Widget build(BuildContext context) {
    final totals =
        scope == DashboardScope.current ? dashboard.current : dashboard.allTime;
    final textTheme = Theme.of(context).textTheme;

    return Card(
      key: ValueKey<String>('currency-section-${dashboard.currency}'),
      child: Padding(
        padding: const EdgeInsets.all(PfSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text(dashboard.currency, style: textTheme.titleLarge),
            const SizedBox(height: PfSpacing.sm),
            _Metric(
              label: 'Present cash',
              value: _money(dashboard.cashBalanceMinor),
              emphasized: true,
            ),
            const SizedBox(height: PfSpacing.sm),
            Wrap(
              spacing: PfSpacing.sm,
              runSpacing: PfSpacing.sm,
              children: <Widget>[
                _Metric(
                    label: 'Contributions',
                    value: _money(totals.contributionMinor)),
                _Metric(label: 'Expenses', value: _money(totals.expenseMinor)),
                _Metric(
                    label: 'Net change', value: _money(totals.netChangeMinor)),
              ],
            ),
            const SizedBox(height: PfSpacing.md),
            Text('Member positions', style: textTheme.titleMedium),
            const SizedBox(height: PfSpacing.xs),
            if (totals.memberPositions.isEmpty)
              Text('No member positions for this period.',
                  style: textTheme.bodyMedium)
            else
              Wrap(
                spacing: PfSpacing.xs,
                runSpacing: PfSpacing.xs,
                children: totals.memberPositions.map(_positionTag).toList(),
              ),
            const SizedBox(height: PfSpacing.md),
            Text('Funds', style: textTheme.titleMedium),
            const SizedBox(height: PfSpacing.xs),
            if (dashboard.funds.isEmpty)
              Text('No funds in this currency.', style: textTheme.bodyMedium)
            else
              ...dashboard.funds.map(_fundCard),
          ],
        ),
      ),
    );
  }

  String _money(int value) =>
      formatMinorCurrency(value, currency: dashboard.currency);

  Widget _positionTag(DashboardMemberPosition member) {
    final isFormer = member.membershipStatus.toLowerCase() != 'active';
    final semantic = member.positionMinor > 0
        ? 'Receivable'
        : member.positionMinor < 0
            ? 'Payable'
            : 'Balanced';
    final former = isFormer ? ' (Former member)' : '';
    return ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 280),
      child: Chip(
        key: ValueKey<String>(
            'member-position-${dashboard.currency}-${member.userId}'),
        backgroundColor: member.positionMinor > 0
            ? PfColors.successSoft
            : member.positionMinor < 0
                ? PfColors.warningSoft
                : PfColors.accentSoft,
        label: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('${member.displayName}$former'),
            Text('$semantic ${_positionMoney(member.positionMinor)}'),
          ],
        ),
      ),
    );
  }

  String _positionMoney(int value) {
    final absolute = _money(value.abs());
    if (value > 0) return '+$absolute';
    if (value < 0) return '-$absolute';
    return absolute;
  }

  Widget _fundCard(DashboardFundCard fund) {
    void openFund() => onFundTap(fund.fundId);
    return Padding(
      padding: const EdgeInsets.only(top: PfSpacing.xs),
      child: Semantics(
        button: true,
        excludeSemantics: true,
        onTap: openFund,
        label: 'Open ${fund.name}. Cash ${_money(fund.cashBalanceMinor)}. '
            'Current net change ${_money(fund.currentNetChangeMinor)}. '
            '${_periodLabel(fund)}',
        child: InkWell(
          key: ValueKey<String>('dashboard-fund-${fund.fundId}'),
          borderRadius: BorderRadius.circular(PfRadii.card),
          onTap: openFund,
          child: Container(
            width: double.infinity,
            padding: const EdgeInsets.all(PfSpacing.sm),
            decoration: BoxDecoration(
              color: PfColors.surface,
              borderRadius: BorderRadius.circular(PfRadii.card),
              border: Border.all(color: PfColors.lineSoft),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(fund.name,
                    style: const TextStyle(fontWeight: FontWeight.w700)),
                const SizedBox(height: PfSpacing.xs),
                Text('Cash ${_money(fund.cashBalanceMinor)}'),
                Text(
                    'Current net change ${_money(fund.currentNetChangeMinor)}'),
                Text(_periodLabel(fund)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  String _periodLabel(DashboardFundCard fund) {
    if (fund.periodStart == null && fund.periodEnd == null) {
      return 'No activity period yet';
    }
    final formatter = DateFormat('yyyy-MM-dd');
    final start = fund.periodStart == null
        ? 'Beginning'
        : formatter.format(fund.periodStart!);
    final end =
        fund.periodEnd == null ? 'Present' : formatter.format(fund.periodEnd!);
    return 'Current period $start – $end';
  }
}

class _Metric extends StatelessWidget {
  const _Metric(
      {required this.label, required this.value, this.emphasized = false});

  final String label;
  final String value;
  final bool emphasized;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ConstrainedBox(
      constraints: const BoxConstraints(minWidth: 120, maxWidth: 280),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          Text(label, style: textTheme.bodySmall),
          Text(value,
              style: emphasized ? textTheme.titleLarge : textTheme.titleMedium),
        ],
      ),
    );
  }
}
