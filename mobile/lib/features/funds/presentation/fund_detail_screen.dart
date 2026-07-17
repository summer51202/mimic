import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../../../shared/utils/currency_formatter.dart';
import '../../home/data/group_dashboard.dart';
import '../../home/presentation/widgets/period_scope_control.dart';
import '../data/fund_repository.dart';
import '../providers/fund_detail_provider.dart';

class FundDetailScreen extends ConsumerWidget {
  const FundDetailScreen({super.key, required this.fundId});
  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(fundDetailProvider(fundId));
    return Scaffold(
      appBar: AppBar(
          title: const Text('Fund detail'),
          backgroundColor: Colors.transparent),
      body: SafeArea(
        child: detail.when(
          data: (summary) => _FundContent(fundId: fundId, summary: summary),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
              child: Padding(
            padding: const EdgeInsets.all(PfSpacing.lg),
            child: Column(mainAxisSize: MainAxisSize.min, children: <Widget>[
              const Text('Unable to load this fund right now.'),
              const SizedBox(height: PfSpacing.sm),
              ElevatedButton(
                  onPressed: () => ref.invalidate(fundDetailProvider(fundId)),
                  child: const Text('Retry')),
            ]),
          )),
        ),
      ),
    );
  }
}

class _FundContent extends ConsumerWidget {
  const _FundContent({required this.fundId, required this.summary});
  final String fundId;
  final FundDetailSummary summary;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final scope = ref.watch(fundDetailScopeProvider(fundId));
    final totals =
        scope == DashboardScope.current ? summary.current : summary.allTime;
    final empty = summary.current.contributionMinor == 0 &&
        summary.current.expenseMinor == 0 &&
        summary.allTime.contributionMinor == 0 &&
        summary.allTime.expenseMinor == 0;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(PfSpacing.md),
      child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Card(
                color: PfColors.accentSoft,
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.lg),
                  child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text(summary.fundName,
                            style: theme.textTheme.titleLarge),
                        Text(summary.currency,
                            style: theme.textTheme.labelLarge),
                        const SizedBox(height: PfSpacing.md),
                        Text('Present cash', style: theme.textTheme.bodyMedium),
                        Text(
                            formatMinorCurrency(summary.cashBalanceMinor,
                                currency: summary.currency),
                            softWrap: true,
                            style: theme.textTheme.headlineMedium),
                        const SizedBox(height: PfSpacing.sm),
                        Text(_periodLabel(summary)),
                        Text(_settlementLabel(summary)),
                      ]),
                )),
            const SizedBox(height: PfSpacing.lg),
            Wrap(
                spacing: PfSpacing.md,
                runSpacing: PfSpacing.sm,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Text('Fund overview', style: theme.textTheme.titleMedium),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: PeriodScopeControl(
                        scope: scope,
                        onChanged: (value) => ref
                            .read(fundDetailScopeProvider(fundId).notifier)
                            .state = value),
                  ),
                ]),
            const SizedBox(height: PfSpacing.sm),
            Wrap(
                spacing: PfSpacing.sm,
                runSpacing: PfSpacing.sm,
                children: <Widget>[
                  _Metric(
                      label: 'Contributions',
                      value: totals.contributionMinor,
                      currency: summary.currency),
                  _Metric(
                      label: 'Expenses',
                      value: totals.expenseMinor,
                      currency: summary.currency),
                  _Metric(
                      label: 'Net change',
                      value: totals.netChangeMinor,
                      currency: summary.currency),
                ]),
            const SizedBox(height: PfSpacing.lg),
            Text('Member positions', style: theme.textTheme.titleMedium),
            const SizedBox(height: PfSpacing.sm),
            if (totals.memberPositions.isEmpty)
              const Card(
                  child: Padding(
                      padding: EdgeInsets.all(PfSpacing.md),
                      child: Text('No member positions for this period.')))
            else
              Card(
                  child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.sm),
                      child: Column(
                          children: totals.memberPositions.map((member) {
                        final state = member.positionMinor > 0
                            ? 'Receivable'
                            : member.positionMinor < 0
                                ? 'Payable'
                                : 'Balanced';
                        final former =
                            member.membershipStatus.toLowerCase() == 'active'
                                ? ''
                                : ' • Former member';
                        return ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(member.displayName),
                            subtitle: Text('$state$former'),
                            trailing: Text(formatMinorCurrency(
                                member.positionMinor,
                                currency: summary.currency)));
                      }).toList()))),
            if (empty) ...<Widget>[
              const SizedBox(height: PfSpacing.md),
              Text('No records yet', style: theme.textTheme.titleMedium),
              const Text(
                  'Add a contribution or record an expense to start this fund.'),
            ],
            const SizedBox(height: PfSpacing.lg),
            Wrap(
                spacing: PfSpacing.sm,
                runSpacing: PfSpacing.xs,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: <Widget>[
                  Text('Recent activity', style: theme.textTheme.titleMedium),
                  TextButton(
                      onPressed: () =>
                          context.push(AppRoutes.fundActivityPath(fundId)),
                      child: const Text('View activity')),
                ]),
            if (summary.recentActivity.isEmpty)
              const Card(
                  child: Padding(
                      padding: EdgeInsets.all(PfSpacing.md),
                      child: Text('No recent fund activity yet.')))
            else
              Card(
                  child: Column(
                      children: summary.recentActivity
                          .map((item) => ListTile(
                              title: Text(item.title),
                              subtitle: Text(
                                  '${DateFormat('yyyy-MM-dd').format(item.occurredOn)} • ${formatMinorCurrency(item.amountMinor, currency: summary.currency)}')))
                          .toList())),
            const SizedBox(height: PfSpacing.lg),
            Wrap(
                spacing: PfSpacing.sm,
                runSpacing: PfSpacing.sm,
                children: <Widget>[
                  ElevatedButton(
                      onPressed: () =>
                          context.push(AppRoutes.createExpensePath(fundId)),
                      child: const Text('Record expense')),
                  OutlinedButton(
                      onPressed: () => context
                          .push(AppRoutes.createContributionPath(fundId)),
                      child: const Text('Add contribution')),
                  OutlinedButton(
                      onPressed: () =>
                          context.push(AppRoutes.settlementPath(fundId)),
                      child: const Text('View settlement')),
                ]),
          ]),
    );
  }

  String _periodLabel(FundDetailSummary value) {
    if (value.periodStart == null && value.periodEnd == null) {
      return 'Current period: no activity yet';
    }
    final f = DateFormat('yyyy-MM-dd');
    return 'Current period: ${value.periodStart == null ? 'Start' : f.format(value.periodStart!)} – ${value.periodEnd == null ? 'Today' : f.format(value.periodEnd!)}';
  }

  String _settlementLabel(FundDetailSummary value) => value
              .lastCompletedPeriodEnd ==
          null
      ? 'No completed settlement yet'
      : 'Latest settlement through ${DateFormat('yyyy-MM-dd').format(value.lastCompletedPeriodEnd!)}';
}

class _Metric extends StatelessWidget {
  const _Metric(
      {required this.label, required this.value, required this.currency});
  final String label;
  final int value;
  final String currency;
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 165,
      child: Card(
          child: Padding(
        padding: const EdgeInsets.all(PfSpacing.md),
        child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text(label),
              const SizedBox(height: PfSpacing.xs),
              Text(formatMinorCurrency(value, currency: currency),
                  softWrap: true,
                  style: Theme.of(context).textTheme.titleMedium)
            ]),
      )));
}
