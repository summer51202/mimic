import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/create_group_controller.dart';

class CreateGroupScreen extends ConsumerWidget {
  const CreateGroupScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(createGroupControllerProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Create group')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Start a shared space', style: textTheme.titleLarge),
                  const SizedBox(height: PfSpacing.xs),
                  Text(
                    'Create a group for your partner, household, or trip. You can invite members next.',
                    style: textTheme.bodyMedium,
                  ),
                  const SizedBox(height: PfSpacing.lg),
                  TextField(
                    onChanged: ref
                        .read(createGroupControllerProvider.notifier)
                        .updateName,
                    decoration: const InputDecoration(
                      labelText: 'Group name',
                      hintText: 'Our Home',
                    ),
                  ),
                  const SizedBox(height: PfSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: state.groupType,
                    decoration: const InputDecoration(labelText: 'Group type'),
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(
                        value: 'couple',
                        child: Text('Couple'),
                      ),
                      DropdownMenuItem(
                        value: 'group',
                        child: Text('Group'),
                      ),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        ref
                            .read(createGroupControllerProvider.notifier)
                            .updateGroupType(value);
                      }
                    },
                  ),
                  const SizedBox(height: PfSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: state.defaultCurrency,
                    decoration:
                        const InputDecoration(labelText: 'Default currency'),
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(value: 'TWD', child: Text('TWD')),
                      DropdownMenuItem(value: 'USD', child: Text('USD')),
                    ],
                    onChanged: (value) {
                      if (value != null) {
                        ref
                            .read(createGroupControllerProvider.notifier)
                            .updateCurrency(value);
                      }
                    },
                  ),
                  if (state.errorMessage != null) ...<Widget>[
                    const SizedBox(height: PfSpacing.md),
                    Text(
                      state.errorMessage!,
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.error,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                  const SizedBox(height: PfSpacing.xl),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isSubmitting
                          ? null
                          : () async {
                              final success = await ref
                                  .read(createGroupControllerProvider.notifier)
                                  .submit();
                              if (success && context.mounted) {
                                context.go(AppRoutes.home);
                              }
                            },
                      child: Text(
                        state.isSubmitting ? 'Creating...' : 'Create group',
                      ),
                    ),
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
