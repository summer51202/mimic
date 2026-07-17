import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../data/settlement_repository.dart';
import '../providers/settlement_provider.dart';

class SettlementScreen extends ConsumerStatefulWidget {
  const SettlementScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  ConsumerState<SettlementScreen> createState() => _SettlementScreenState();
}

class _SettlementScreenState extends ConsumerState<SettlementScreen> {
  bool _isMutating = false;

  Future<void> _completeSettlement(String settlementId) {
    return _runMutation(
      action: () => ref
          .read(settlementRepositoryProvider)
          .completeSettlement(settlementId),
      successMessage: 'Settlement marked as completed.',
      errorMessage: 'Unable to complete settlement right now.',
    );
  }

  Future<void> _confirmCancellation(String settlementId) async {
    final shouldCancel = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Cancel pending settlement?'),
        content: const Text(
          'This cancels the pending settlement without locking the period.',
        ),
        actions: <Widget>[
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Keep settlement'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(foregroundColor: PfColors.accent),
            child: const Text('Cancel settlement'),
          ),
        ],
      ),
    );
    if (shouldCancel != true || !mounted) {
      return;
    }

    await _runMutation(
      action: () =>
          ref.read(settlementRepositoryProvider).cancelSettlement(settlementId),
      successMessage: 'Settlement canceled.',
      errorMessage: 'Unable to cancel settlement right now.',
    );
  }

  Future<void> _runMutation({
    required Future<void> Function() action,
    required String successMessage,
    required String errorMessage,
  }) async {
    if (_isMutating) {
      return;
    }

    setState(() => _isMutating = true);
    try {
      await action();
      if (!mounted) {
        return;
      }
      ref.invalidate(settlementProvider(widget.fundId));
      _showMessage(successMessage);
    } catch (_) {
      if (mounted) {
        _showMessage(errorMessage);
      }
    } finally {
      if (mounted) {
        setState(() => _isMutating = false);
      }
    }
  }

  void _showMessage(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    final settlementAsync = ref.watch(settlementProvider(widget.fundId));

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
                    onPressed:
                        summary.currentSettlementId == null || _isMutating
                            ? null
                            : () => _completeSettlement(
                                  summary.currentSettlementId!,
                                ),
                    child: const Text('Complete settlement'),
                  ),
                ),
                const SizedBox(height: PfSpacing.sm),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed:
                        summary.currentSettlementId == null || _isMutating
                            ? null
                            : () => _confirmCancellation(
                                  summary.currentSettlementId!,
                                ),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: PfColors.accent,
                    ),
                    child: const Text('Cancel settlement'),
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
