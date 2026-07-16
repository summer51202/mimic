import 'package:flutter/material.dart';

import '../../../groups/data/group_summary.dart';
import '../../../../shared/constants/design_tokens.dart';

class CurrentGroupCard extends StatelessWidget {
  const CurrentGroupCard({
    required this.group,
    required this.groups,
    required this.onSelect,
    super.key,
  });

  final GroupSummary group;
  final List<GroupSummary> groups;
  final ValueChanged<GroupSummary> onSelect;

  @override
  Widget build(BuildContext context) {
    final textTheme = Theme.of(context).textTheme;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(PfSpacing.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Current group', style: textTheme.labelLarge),
            const SizedBox(height: PfSpacing.xs),
            Row(
              children: <Widget>[
                Expanded(child: Text(group.name, style: textTheme.titleLarge)),
                if (groups.length > 1)
                  TextButton.icon(
                    onPressed: () => _showGroupSelector(context),
                    icon: const Icon(Icons.swap_horiz),
                    label: const Text('Switch'),
                  ),
              ],
            ),
            const SizedBox(height: PfSpacing.xs),
            Wrap(
              spacing: PfSpacing.xs,
              runSpacing: PfSpacing.xs,
              children: <Widget>[
                _InfoTag(label: _roleLabel(group.role)),
                _InfoTag(label: '${group.memberCount} members'),
                _InfoTag(label: _typeLabel(group.groupType)),
              ],
            ),
            if (group.members.isNotEmpty) ...<Widget>[
              const SizedBox(height: PfSpacing.sm),
              const Divider(),
              Theme(
                data: Theme.of(context)
                    .copyWith(dividerColor: Colors.transparent),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  childrenPadding: EdgeInsets.zero,
                  title: Text(
                    'Members (${group.memberCount})',
                    style: textTheme.titleMedium,
                  ),
                  children: <Widget>[
                    for (final member in group.members)
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        dense: true,
                        leading: CircleAvatar(
                          child: Text(
                            member.displayName.isEmpty
                                ? '?'
                                : member.displayName.characters.first
                                    .toUpperCase(),
                          ),
                        ),
                        title: Text(member.displayName),
                        trailing: Text(_roleLabel(member.role)),
                      ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _showGroupSelector(BuildContext context) async {
    final selected = await showModalBottomSheet<GroupSummary>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.only(bottom: PfSpacing.md),
          children: <Widget>[
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: PfSpacing.md),
              child: Text(
                'Switch group',
                style: Theme.of(context).textTheme.titleLarge,
              ),
            ),
            const SizedBox(height: PfSpacing.xs),
            for (final candidate in groups)
              ListTile(
                title: Text(candidate.name),
                subtitle: Text(
                  '${_roleLabel(candidate.role)} · ${candidate.memberCount} members',
                ),
                trailing: candidate.id == group.id
                    ? const Icon(Icons.check_circle)
                    : null,
                onTap: () => Navigator.pop(context, candidate),
              ),
          ],
        ),
      ),
    );
    if (selected != null && selected.id != group.id) onSelect(selected);
  }

  static String _roleLabel(String role) =>
      role.toUpperCase() == 'OWNER' ? 'Owner' : 'Member';

  static String _typeLabel(String type) =>
      type.toUpperCase() == 'COUPLE' ? 'Couple' : 'Group';
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
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(
              color: PfColors.inkPrimary,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }
}
