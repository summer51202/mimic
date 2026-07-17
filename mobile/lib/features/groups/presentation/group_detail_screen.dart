import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../data/group_repository.dart';
import '../data/group_summary.dart';
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

class _GroupDetailBody extends ConsumerWidget {
  const _GroupDetailBody({required this.detail});

  final GroupDetail detail;

  bool get _isOwner => detail.role.toLowerCase() == 'owner';

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final mutation = ref.watch(
      groupMemberMutationControllerProvider(detail.id),
    );
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
                    .map((member) => _MemberTile(
                          member: member,
                          isCurrentUser: member.id == detail.currentUserId,
                          canManage: _isOwner && !mutation.isSubmitting,
                          onManage: () => _showMemberActions(
                            context,
                            ref,
                            member,
                          ),
                        ))
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
        const SizedBox(height: PfSpacing.xl),
        _GroupDangerZone(
          isSubmitting: mutation.isSubmitting,
          onLeave: () => _confirmLeave(context, ref),
        ),
      ],
    );
  }

  Future<void> _showMemberActions(
    BuildContext context,
    WidgetRef ref,
    GroupMemberSummary member,
  ) async {
    final action = await showModalBottomSheet<_MemberAction>(
      context: context,
      showDragHandle: true,
      builder: (_) => _MemberActionsSheet(member: member),
    );
    if (action == null || !context.mounted) return;
    final promote = action == _MemberAction.changeRole &&
        member.role.toLowerCase() != 'owner';
    final verb = action == _MemberAction.remove
        ? 'Remove'
        : promote
            ? 'Make Owner'
            : 'Make Member';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('$verb ${member.displayName}?'),
        content: Text(action == _MemberAction.remove
            ? '${member.displayName} will lose access to this group. Their accounting history remains.'
            : promote
                ? '${member.displayName} will be able to manage members and group settings.'
                : '${member.displayName} will no longer be able to manage this group.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: action == _MemberAction.remove
                ? FilledButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.error,
                  )
                : null,
            onPressed: () => Navigator.pop(dialogContext, true),
            child: Text(action == _MemberAction.remove ? 'Remove' : verb),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final controller = ref.read(
      groupMemberMutationControllerProvider(detail.id).notifier,
    );
    final success = action == _MemberAction.remove
        ? await controller.remove(member.id)
        : await controller.changeRole(
            member.id,
            promote ? 'owner' : 'member',
          );
    if (!context.mounted) return;
    final state = ref.read(groupMemberMutationControllerProvider(detail.id));
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(success
          ? '$verb completed.'
          : state.errorMessage ??
              'Unable to update group membership right now.'),
    ));
  }

  Future<void> _confirmLeave(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Leave group?'),
        content: Text(
            'You will lose access to ${detail.name}. Your accounting history remains.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(dialogContext, false),
              child: const Text('Cancel')),
          FilledButton(
            style: FilledButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.error),
            onPressed: () => Navigator.pop(dialogContext, true),
            child: const Text('Leave group'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    final success = await ref
        .read(groupMemberMutationControllerProvider(detail.id).notifier)
        .leave();
    if (!context.mounted) return;
    if (success) {
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('You left the group.')));
      context.go(AppRoutes.home);
    } else {
      final state = ref.read(groupMemberMutationControllerProvider(detail.id));
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(state.errorMessage ??
              'Unable to update group membership right now.')));
    }
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

class _MemberTile extends StatelessWidget {
  const _MemberTile(
      {required this.member,
      required this.isCurrentUser,
      required this.canManage,
      required this.onManage});
  final GroupMemberSummary member;
  final bool isCurrentUser;
  final bool canManage;
  final VoidCallback onManage;

  @override
  Widget build(BuildContext context) => ListTile(
        leading: CircleAvatar(
            child: Text(member.displayName.isEmpty
                ? '?'
                : member.displayName.characters.first.toUpperCase())),
        title: Text(member.displayName),
        subtitle: Align(
            alignment: Alignment.centerLeft,
            child: _InfoTag(
                label:
                    member.role.toLowerCase() == 'owner' ? 'Owner' : 'Member')),
        trailing: canManage && !isCurrentUser
            ? IconButton(
                key: Key('member-actions-${member.id}'),
                tooltip: 'Manage ${member.displayName}',
                onPressed: onManage,
                icon: const Icon(Icons.more_vert))
            : null,
      );
}

enum _MemberAction { changeRole, remove }

class _MemberActionsSheet extends StatelessWidget {
  const _MemberActionsSheet({required this.member});
  final GroupMemberSummary member;
  @override
  Widget build(BuildContext context) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
              title: Text(member.displayName),
              subtitle: const Text('Member actions')),
          ListTile(
              leading: const Icon(Icons.admin_panel_settings_outlined),
              title: Text(member.role.toLowerCase() == 'owner'
                  ? 'Make Member'
                  : 'Make Owner'),
              onTap: () => Navigator.pop(context, _MemberAction.changeRole)),
          ListTile(
              textColor: Theme.of(context).colorScheme.error,
              iconColor: Theme.of(context).colorScheme.error,
              leading: const Icon(Icons.person_remove_outlined),
              title: const Text('Remove member'),
              onTap: () => Navigator.pop(context, _MemberAction.remove)),
        ]),
      );
}

class _GroupDangerZone extends StatelessWidget {
  const _GroupDangerZone({required this.isSubmitting, required this.onLeave});
  final bool isSubmitting;
  final VoidCallback onLeave;
  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.all(PfSpacing.md),
        decoration: BoxDecoration(
            border: Border.all(color: Theme.of(context).colorScheme.error),
            borderRadius: BorderRadius.circular(PfRadii.card)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Danger zone', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: PfSpacing.xs),
          const Text('Leave this group while keeping its accounting history.'),
          const SizedBox(height: PfSpacing.sm),
          OutlinedButton.icon(
            style: OutlinedButton.styleFrom(
                foregroundColor: Theme.of(context).colorScheme.error),
            onPressed: isSubmitting ? null : onLeave,
            icon: const Icon(Icons.logout),
            label: Text(isSubmitting ? 'Working...' : 'Leave group'),
          ),
        ]),
      );
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
