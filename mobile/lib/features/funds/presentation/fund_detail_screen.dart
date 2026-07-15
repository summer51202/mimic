import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/fund_detail_provider.dart';

class FundDetailScreen extends ConsumerWidget {
  const FundDetailScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final fundDetailAsync = ref.watch(fundDetailProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fund detail'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: fundDetailAsync.when(
          data: (summary) => SingleChildScrollView(
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
                        Text(summary.fundName, style: textTheme.titleLarge),
                        const SizedBox(height: PfSpacing.sm),
                        Text(summary.balanceLabel, style: textTheme.headlineMedium),
                        const SizedBox(height: PfSpacing.sm),
                        Text(summary.lockedPeriodLabel, style: textTheme.bodyMedium),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: PfSpacing.lg),
                Text('Member positions', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                if (summary.memberPositions.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text('No records yet', style: textTheme.titleMedium),
                          const SizedBox(height: PfSpacing.xs),
                          Text(
                            'Add your first expense or contribution to see positions.',
                            style: textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Column(
                        children: summary.memberPositions
                            .map(
                              (member) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(member.name),
                                trailing: Text(member.positionLabel),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ),
                const SizedBox(height: PfSpacing.lg),
                Text('This month', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(PfSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text('Expenses', style: textTheme.bodyMedium),
                              const SizedBox(height: PfSpacing.xs),
                              Text(
                                summary.monthExpenseLabel,
                                style: textTheme.titleMedium,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: PfSpacing.sm),
                    Expanded(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(PfSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text('Contributions', style: textTheme.bodyMedium),
                              const SizedBox(height: PfSpacing.xs),
                              Text(
                                summary.monthContributionLabel,
                                style: textTheme.titleMedium,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: PfSpacing.lg),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: <Widget>[
                    Text('Recent activity', style: textTheme.titleMedium),
                    TextButton(
                      onPressed: () {
                        context.push(AppRoutes.fundActivityPath(fundId));
                      },
                      child: const Text('View activity'),
                    ),
                  ],
                ),
                if (summary.recentActivity.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Text(
                        'No recent fund activity yet.',
                        style: textTheme.bodyMedium,
                      ),
                    ),
                  )
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Column(
                        children: summary.recentActivity
                            .map(
                              (item) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(item.title),
                                subtitle: Text(item.subtitle),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ),
                const SizedBox(height: PfSpacing.lg),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      context.push(AppRoutes.createExpensePath(fundId));
                    },
                    child: const Text('Add record'),
                  ),
                ),
                const SizedBox(height: PfSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      context.push(AppRoutes.createContributionPath(fundId));
                    },
                    child: const Text('Add contribution'),
                  ),
                ),
                const SizedBox(height: PfSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {
                      context.push(AppRoutes.settlementPath(fundId));
                    },
                    child: const Text('View settlement'),
                  ),
                ),
              ],
            ),
          ),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Text(
                'Unable to load this fund right now.',
                style: textTheme.bodyLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
