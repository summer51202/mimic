import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../groups/providers/selected_group_provider.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/home_summary_provider.dart';
import 'widgets/balance_hero_card.dart';
import 'widgets/currency_dashboard_section.dart';
import 'widgets/fund_card_list.dart';
import 'widgets/current_group_card.dart';
import 'widgets/period_scope_control.dart';

class HomeDashboardScreen extends ConsumerWidget {
  const HomeDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final homeSummaryAsync = ref.watch(homeSummaryProvider);
    final groupsAsync = ref.watch(homeGroupsProvider);

    return Scaffold(
      body: SafeArea(
        child: homeSummaryAsync.when(
          data: (summary) {
            final scope = ref.watch(dashboardScopeProvider(summary.groupId));
            return SingleChildScrollView(
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
                  groupsAsync.when(
                    data: (groups) {
                      if (groups.isEmpty) {
                        return Card(
                          child: Padding(
                            padding: const EdgeInsets.all(PfSpacing.md),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: <Widget>[
                                Text('You are not in a group yet',
                                    style: textTheme.titleLarge),
                                const SizedBox(height: PfSpacing.xs),
                                Text(
                                  'Join with an invite code to start sharing funds with your partner or group.',
                                  style: textTheme.bodyMedium,
                                ),
                                const SizedBox(height: PfSpacing.md),
                                Row(
                                  children: <Widget>[
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: () =>
                                            context.push(AppRoutes.createGroup),
                                        child: const Text('Create group'),
                                      ),
                                    ),
                                    const SizedBox(width: PfSpacing.sm),
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () => context
                                            .push(AppRoutes.acceptInvite),
                                        child: const Text('Join with code'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      }
                      final selectedId = ref.watch(selectedGroupProvider);
                      final current = groups.firstWhere(
                        (group) => group.id == (selectedId ?? summary.groupId),
                        orElse: () => groups.first,
                      );
                      return CurrentGroupCard(
                        group: current,
                        groups: groups,
                        onSelect: (group) {
                          ref
                              .read(selectedGroupProvider.notifier)
                              .select(group.id);
                        },
                        onCreateGroup: () =>
                            context.push(AppRoutes.createGroup),
                        onViewGroup: () =>
                            context.push(AppRoutes.groupDetailPath(current.id)),
                      );
                    },
                    loading: () => const LinearProgressIndicator(),
                    error: (_, __) => const SizedBox.shrink(),
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
                  if (summary.dashboard != null) ...<Widget>[
                    Wrap(
                      spacing: PfSpacing.md,
                      runSpacing: PfSpacing.sm,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: <Widget>[
                        Text(
                          'Fund overview',
                          style: textTheme.titleLarge,
                        ),
                        PeriodScopeControl(
                          scope: scope,
                          onChanged: (value) => ref
                              .read(dashboardScopeProvider(summary.groupId)
                                  .notifier)
                              .state = value,
                        ),
                      ],
                    ),
                    const SizedBox(height: PfSpacing.sm),
                    if (summary.dashboard!.currencies.isEmpty)
                      _EmptyFundsCard(
                        onCreate: () => context.push(AppRoutes.createFund),
                      )
                    else
                      ...summary.dashboard!.currencies.map(
                        (currency) => Padding(
                          padding: const EdgeInsets.only(bottom: PfSpacing.sm),
                          child: CurrencyDashboardSection(
                            dashboard: currency,
                            scope: scope,
                            onFundTap: (fundId) => context.push(
                              AppRoutes.fundDetailPath(fundId),
                            ),
                          ),
                        ),
                      ),
                  ] else ...<Widget>[
                    BalanceHeroCard(
                      displayName: summary.displayName,
                      totalBalanceLabel: summary.totalBalanceLabel,
                    ),
                    const SizedBox(height: PfSpacing.lg),
                  ],
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
                  if (summary.dashboard == null) ...<Widget>[
                    Text('Active funds', style: textTheme.titleMedium),
                    const SizedBox(height: PfSpacing.sm),
                    if (summary.activeFunds.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(PfSpacing.md),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: <Widget>[
                              Text('No funds yet',
                                  style: textTheme.titleMedium),
                              const SizedBox(height: PfSpacing.xs),
                              Text(
                                'Create your first shared fund to start contributions, expenses, and settlement tracking.',
                                style: textTheme.bodyMedium,
                              ),
                              const SizedBox(height: PfSpacing.md),
                              ElevatedButton(
                                onPressed: () =>
                                    context.push(AppRoutes.createFund),
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
                  ],
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
                        child: Wrap(
                          spacing: PfSpacing.md,
                          runSpacing: PfSpacing.xs,
                          alignment: WrapAlignment.spaceBetween,
                          crossAxisAlignment: WrapCrossAlignment.center,
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
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  Text(
                    'Unable to load your dashboard right now.',
                    style: textTheme.bodyLarge,
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: PfSpacing.md),
                  ElevatedButton(
                    onPressed: () {
                      ref.invalidate(homeGroupsProvider);
                      ref.invalidate(homeSummaryProvider);
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyFundsCard extends StatelessWidget {
  const _EmptyFundsCard({required this.onCreate});

  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(PfSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('No funds yet',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: PfSpacing.xs),
            const Text('Create your first fund to see its dashboard here.'),
            const SizedBox(height: PfSpacing.md),
            ElevatedButton(
                onPressed: onCreate, child: const Text('Create fund')),
          ],
        ),
      ),
    );
  }
}
