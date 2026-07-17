import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../data/settlement_repository.dart';
import '../providers/settlement_provider.dart';

class SettlementScreen extends ConsumerWidget {
  const SettlementScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final settlementAsync = ref.watch(settlementProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settlement'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: settlementAsync.when(
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
                        Text('Settlement period', style: textTheme.titleMedium),
                        const SizedBox(height: PfSpacing.sm),
                        Text(summary.periodLabel, style: textTheme.titleLarge),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: PfSpacing.lg),
                Text('Suggested transfer', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(PfSpacing.md),
                    child: Column(
                      children: summary.suggestions
                          .map(
                            (item) => ListTile(
                              contentPadding: EdgeInsets.zero,
                              title: Text(
                                '${item.fromUser} pays ${item.toUser}',
                              ),
                              trailing: Text(item.amountLabel),
                            ),
                          )
                          .toList(),
                    ),
                  ),
                ),
                const SizedBox(height: PfSpacing.lg),
                Card(
                  color: PfColors.warningSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(PfSpacing.md),
                    child: Text(
                      summary.lockMessage,
                      style: textTheme.titleMedium,
                    ),
                  ),
                ),
                const SizedBox(height: PfSpacing.lg),
                Text('Settlement history', style: textTheme.titleMedium),
                const SizedBox(height: PfSpacing.sm),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(PfSpacing.md),
                    child: Column(
                      children: summary.history
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
                const SizedBox(height: PfSpacing.xl),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: summary.currentSettlementId == null
                        ? null
                        : () async {
                            await ref
                                .read(settlementRepositoryProvider)
                                .completeSettlement(
                                  summary.currentSettlementId!,
                                );
                            if (!context.mounted) {
                              return;
                            }
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Settlement marked as completed.',
                                ),
                              ),
                            );
                          },
                    child: const Text('Complete settlement'),
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
                'Unable to load settlement right now.',
                style: textTheme.bodyLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
