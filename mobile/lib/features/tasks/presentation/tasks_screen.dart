import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../providers/tasks_provider.dart';

class TasksScreen extends ConsumerWidget {
  const TasksScreen({super.key});

  Future<String?> _promptForComment(
    BuildContext context, {
    required String actionLabel,
  }) async {
    final controller = TextEditingController();

    return showDialog<String>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text('$actionLabel confirmation'),
          content: TextField(
            controller: controller,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Comment (optional)',
              hintText: 'Add context for the other member',
            ),
          ),
          actions: <Widget>[
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.of(context).pop(controller.text),
              child: const Text('Submit'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final taskSummary = ref.watch(tasksProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Tasks'),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(PfSpacing.md),
        children: <Widget>[
          Card(
            color: PfColors.warningSoft,
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Pending tasks', style: textTheme.titleLarge),
                  const SizedBox(height: PfSpacing.sm),
                  Text(
                    'Review confirmations, due contributions, and settlement follow-ups here.',
                    style: textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: PfSpacing.md),
          ...taskSummary.when(
            data: (summary) {
              if (summary.items.isEmpty) {
                return <Widget>[
                  const Card(
                    child: ListTile(
                      title: Text('No pending tasks'),
                      subtitle: Text('Everything is up to date right now.'),
                    ),
                  ),
                ];
              }

              return summary.items
                  .map(
                    (task) => Padding(
                      padding: const EdgeInsets.only(bottom: PfSpacing.sm),
                      child: Card(
                        child: Column(
                          children: <Widget>[
                            ListTile(
                              title: Text(task.title),
                              subtitle: Text(task.subtitle),
                              trailing: Text(task.status),
                            ),
                            if (task.status == 'pending')
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  PfSpacing.md,
                                  0,
                                  PfSpacing.md,
                                  PfSpacing.md,
                                ),
                                child: Row(
                                  children: <Widget>[
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () async {
                                          final comment = await _promptForComment(
                                            context,
                                            actionLabel: 'Reject',
                                          );
                                          if (comment == null) {
                                            return;
                                          }
                                          try {
                                            await ref
                                                .read(taskActionServiceProvider)
                                                .reject(task.id, comment: comment);
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                  'Confirmation updated.',
                                                ),
                                              ),
                                            );
                                          } catch (_) {
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                  'Unable to update this confirmation right now.',
                                                ),
                                              ),
                                            );
                                          }
                                        },
                                        child: const Text('Reject'),
                                      ),
                                    ),
                                    const SizedBox(width: PfSpacing.sm),
                                    Expanded(
                                      child: FilledButton(
                                        onPressed: () async {
                                          final comment = await _promptForComment(
                                            context,
                                            actionLabel: 'Approve',
                                          );
                                          if (comment == null) {
                                            return;
                                          }
                                          try {
                                            await ref
                                                .read(taskActionServiceProvider)
                                                .approve(task.id, comment: comment);
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                  'Confirmation updated.',
                                                ),
                                              ),
                                            );
                                          } catch (_) {
                                            if (!context.mounted) {
                                              return;
                                            }
                                            ScaffoldMessenger.of(context)
                                                .showSnackBar(
                                              const SnackBar(
                                                content: Text(
                                                  'Unable to update this confirmation right now.',
                                                ),
                                              ),
                                            );
                                          }
                                        },
                                        child: const Text('Approve'),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),
                  )
                  .toList();
            },
            loading: () => <Widget>[
              const Card(
                child: ListTile(
                  title: Text('Loading tasks...'),
                ),
              ),
            ],
            error: (_, __) => <Widget>[
              const Card(
                child: ListTile(
                  title: Text('Unable to load tasks'),
                  subtitle: Text('Please try again in a moment.'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
