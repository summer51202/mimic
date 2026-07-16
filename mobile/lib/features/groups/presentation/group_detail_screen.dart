import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../data/group_repository.dart';
import '../providers/group_detail_controller.dart';

class GroupDetailScreen extends ConsumerWidget {
  const GroupDetailScreen({required this.groupId, super.key});

  final String groupId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detailAsync = ref.watch(groupDetailProvider(groupId));
    return Scaffold(
      appBar: AppBar(title: const Text('Group details')),
      body: SafeArea(
        child: detailAsync.when(
          data: (detail) => _GroupDetailBody(detail: detail),
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (_, __) => Center(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: <Widget>[
                  const Text('Unable to load this group right now.'),
                  const SizedBox(height: PfSpacing.md),
                  ElevatedButton(
                    onPressed: () =>
                        ref.invalidate(groupDetailProvider(groupId)),
                    child: const Text('Try again'),
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

class _GroupDetailBody extends StatelessWidget {
  const _GroupDetailBody({required this.detail});

  final GroupDetail detail;

  bool get _isOwner => detail.role.toLowerCase() == 'owner';

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.all(PfSpacing.md),
      children: <Widget>[
        Text(detail.name, style: textTheme.headlineMedium),
        const SizedBox(height: PfSpacing.sm),
        Wrap(
          spacing: PfSpacing.xs,
          runSpacing: PfSpacing.xs,
          children: <Widget>[
            _InfoTag(label: _isOwner ? 'Owner' : 'Member'),
            _InfoTag(
              label: detail.groupType.toLowerCase() == 'couple'
                  ? 'Couple'
                  : 'Group',
            ),
            _InfoTag(label: detail.defaultCurrency),
          ],
        ),
        if (_isOwner) ...<Widget>[
          const SizedBox(height: PfSpacing.md),
          Wrap(
            spacing: PfSpacing.sm,
            runSpacing: PfSpacing.sm,
            children: <Widget>[
              OutlinedButton.icon(
                onPressed: () => _showRenameDialog(context),
                icon: const Icon(Icons.edit_outlined),
                label: const Text('Rename group'),
              ),
              ElevatedButton.icon(
                onPressed: () => context.pushNamed(
                  'create-invite',
                  pathParameters: <String, String>{'groupId': detail.id},
                ),
                icon: const Icon(Icons.person_add_alt_1),
                label: const Text('Invite member'),
              ),
            ],
          ),
        ],
        const SizedBox(height: PfSpacing.lg),
        Text('Members (${detail.members.length})', style: textTheme.titleLarge),
        const SizedBox(height: PfSpacing.sm),
        Card(
          child: Column(
            children: detail.members.isEmpty
                ? <Widget>[
                    const Padding(
                      padding: EdgeInsets.all(PfSpacing.md),
                      child: Text('No active members found.'),
                    ),
                  ]
                : detail.members
                    .map(
                      (member) => ListTile(
                        leading: CircleAvatar(
                          child: Text(
                            member.displayName.isEmpty
                                ? '?'
                                : member.displayName.characters.first
                                    .toUpperCase(),
                          ),
                        ),
                        title: Text(member.displayName),
                        trailing: Text(
                          member.role.toLowerCase() == 'owner'
                              ? 'Owner'
                              : 'Member',
                        ),
                      ),
                    )
                    .toList(),
          ),
        ),
        const SizedBox(height: PfSpacing.lg),
        Text('Funds', style: textTheme.titleLarge),
        const SizedBox(height: PfSpacing.sm),
        if (detail.funds.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(PfSpacing.md),
              child: Text('No funds yet'),
            ),
          )
        else
          Card(
            child: Column(
              children: detail.funds
                  .map(
                    (fund) => ListTile(
                      title: Text(fund.name),
                      subtitle: Text(fund.balanceLabel),
                      trailing: const Icon(Icons.chevron_right),
                      onTap: () =>
                          context.push(AppRoutes.fundDetailPath(fund.id)),
                    ),
                  )
                  .toList(),
            ),
          ),
      ],
    );
  }

  Future<void> _showRenameDialog(BuildContext context) async {
    var draftName = detail.name;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) => Consumer(
        builder: (context, dialogRef, _) {
          final state =
              dialogRef.watch(groupRenameControllerProvider(detail.id));
          return AlertDialog(
            title: const Text('Rename group'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: <Widget>[
                TextFormField(
                  initialValue: detail.name,
                  onChanged: (value) => draftName = value,
                  autofocus: true,
                  decoration: const InputDecoration(labelText: 'Group name'),
                ),
                if (state.errorMessage != null) ...<Widget>[
                  const SizedBox(height: PfSpacing.sm),
                  Text(
                    state.errorMessage!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
            actions: <Widget>[
              TextButton(
                onPressed: state.isSubmitting
                    ? null
                    : () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                onPressed: state.isSubmitting
                    ? null
                    : () async {
                        final success = await dialogRef
                            .read(
                              groupRenameControllerProvider(detail.id).notifier,
                            )
                            .submit(draftName);
                        if (success && dialogContext.mounted) {
                          Navigator.pop(dialogContext);
                        }
                      },
                child: Text(state.isSubmitting ? 'Saving...' : 'Save'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InfoTag extends StatelessWidget {
  const _InfoTag({required this.label});

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
        border: Border.all(color: PfColors.lineSoft),
      ),
      child: Text(label, style: Theme.of(context).textTheme.labelMedium),
    );
  }
}
