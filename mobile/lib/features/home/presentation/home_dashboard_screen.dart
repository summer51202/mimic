import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/home_summary_provider.dart';
import 'widgets/balance_hero_card.dart';
import 'widgets/fund_card_list.dart';

class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final homeSummaryAsync = ref.watch(homeSummaryProvider);

    return Scaffold(
      body: SafeArea(
        child: homeSummaryAsync.when(
          data: (summary) => SingleChildScrollView(
            padding: const EdgeInsets.all(PfSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Row(
                  children: <Widget>[
                    Expanded(
                      child: Text(
                        'PairFund',
                        style: textTheme.headlineMedium,
                      ),
                    ),
                    IconButton(
                      tooltip: 'Settings',
                      onPressed: () => context.push(AppRoutes.settings),
                      icon: const Icon(Icons.settings_outlined),
                    ),
                  ],
                ),
                const SizedBox(height: PfSpacing.xs),
                Text(
                  'Shared funds, clear balances, and gentle bookkeeping.',
                  style: textTheme.bodyMedium,
                ),
                const SizedBox(height: PfSpacing.sm),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => context.push(AppRoutes.acceptInvite),
                        child: const Text('Join with code'),
                      ),
                    ),
                    const SizedBox(width: PfSpacing.sm),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: summary.groupId == null
                            ? null
                            : () {
                                context.pushNamed(
                                  'create-invite',
                                  pathParameters: <String, String>{
                                    'groupId': summary.groupId!,
                                  },
                                );
                              },
                        child: const Text('Invite member'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: PfSpacing.lg),
                BalanceHeroCard(
                  displayName: summary.displayName,
                  totalBalanceLabel: summary.totalBalanceLabel,
                ),
                const SizedBox(height: PfSpacing.lg),
                Text('Quick actions', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                Row(
                  children: <Widget>[
                    Expanded(
                      child: OutlinedButton(
                        onPressed: summary.activeFunds.isEmpty
                            ? null
                            : () {
                                context.push(
                                  AppRoutes.createExpensePath(
                                    summary.activeFunds.first.id,
                                  ),
                                );
                              },
                        child: const Text('Add expense'),
                      ),
                    ),
                    const SizedBox(width: PfSpacing.sm),
                    Expanded(
                      child: ElevatedButton(
                        onPressed: summary.activeFunds.isEmpty
                            ? null
                            : () {
                                context.push(
                                  AppRoutes.settlementPath(
                                    summary.activeFunds.first.id,
                                  ),
                                );
                              },
                        child: const Text('Settle'),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: PfSpacing.lg),
                Text('Active funds', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                if (summary.activeFunds.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: <Widget>[
                          Text('No funds yet', style: textTheme.titleMedium),
                          const SizedBox(height: PfSpacing.xs),
                          Text(
                            'Create your first shared fund to start contributions, expenses, and settlement tracking.',
                            style: textTheme.bodyMedium,
                          ),
                          const SizedBox(height: PfSpacing.md),
                          ElevatedButton(
                            onPressed: () => context.push(AppRoutes.createFund),
                            child: const Text('Create fund'),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  FundCardList(
                    funds: summary.activeFunds,
                    onFundTap: (fund) {
                      context.push(AppRoutes.fundDetailPath(fund.id));
                    },
                  ),
                const SizedBox(height: PfSpacing.lg),
                Text('Recent activity', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                if (summary.recentActivities.isEmpty)
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Text(
                        'No recent activity yet.',
                        style: textTheme.bodyMedium,
                      ),
                    ),
                  )
                else
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Column(
                        children: summary.recentActivities
                            .map(
                              (activity) => ListTile(
                                contentPadding: EdgeInsets.zero,
                                title: Text(activity.title),
                                subtitle: Text(activity.subtitle),
                              ),
                            )
                            .toList(),
                      ),
                    ),
                  ),
                const SizedBox(height: PfSpacing.lg),
                InkWell(
                  borderRadius: BorderRadius.circular(PfRadii.card),
                  onTap: () => context.push(AppRoutes.confirmations),
                  child: Card(
                    color: PfColors.warningSoft,
                    child: Padding(
                      padding: const EdgeInsets.all(PfSpacing.md),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: <Widget>[
                          Text('Pending tasks', style: textTheme.titleMedium),
                          Text(
                            '${summary.pendingTasksCount}',
                            style: textTheme.titleLarge,
                          ),
                        ],
                      ),
                    ),
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
                'Unable to load your shared funds right now.',
                style: textTheme.bodyLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
