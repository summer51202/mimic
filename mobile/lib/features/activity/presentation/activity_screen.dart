import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../data/remote/activity_remote_mapper.dart';
import '../providers/activity_provider.dart';

class ActivityScreen extends ConsumerWidget {
  const ActivityScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final activityAsync = ref.watch(activityProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Activity'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: activityAsync.when(
          data: (timeline) {
            if (timeline.items.isEmpty) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.lg),
                  child: Text(
                    'No activity yet.',
                    style: textTheme.bodyLarge,
                  ),
                ),
              );
            }

            return ListView(
              padding: const EdgeInsets.all(PfSpacing.md),
              children: <Widget>[
                Text('Activity timeline', style: textTheme.titleLarge),
                const SizedBox(height: PfSpacing.sm),
                Text(
                  'Expenses, contributions, corrections, and settlements appear together here.',
                  style: textTheme.bodyMedium,
                ),
                const SizedBox(height: PfSpacing.lg),
                ...timeline.items.map(_buildTimelineCard),
              ],
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Text(
                'Unable to load activity right now.',
                style: textTheme.bodyLarge,
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTimelineCard(ActivityTimelineItem item) {
    return Padding(
      padding: const EdgeInsets.only(bottom: PfSpacing.sm),
      child: Card(
        child: ListTile(
          contentPadding: const EdgeInsets.all(PfSpacing.md),
          title: Text(item.title),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(item.subtitle),
              const SizedBox(height: PfSpacing.xs),
              Text(item.occurredOn),
            ],
          ),
          trailing: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              Text(item.amountLabel),
              if (item.statusLabel != null) ...<Widget>[
                const SizedBox(height: PfSpacing.xs),
                _StatusBadge(label: item.statusLabel!),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusBadge extends StatelessWidget {
  const _StatusBadge({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: PfSpacing.sm,
        vertical: PfSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: PfColors.accentSoft,
        borderRadius: BorderRadius.circular(PfRadii.chip),
      ),
      child: Text(label),
    );
  }
}
