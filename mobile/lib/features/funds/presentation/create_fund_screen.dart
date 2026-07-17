import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/create_fund_controller.dart';

class CreateFundScreen extends ConsumerWidget {
  const CreateFundScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final formState = ref.watch(createFundControllerProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create fund'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.lg),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    'Create your first shared fund',
                    style: textTheme.titleLarge,
                  ),
                  const SizedBox(height: PfSpacing.sm),
                  Text(
                    'Create a fund first, then start recording contributions, expenses, and settlements.',
                    style: textTheme.bodyMedium,
                  ),
                  const SizedBox(height: PfSpacing.lg),
                  TextField(
                    decoration: const InputDecoration(
                      labelText: 'Fund name',
                      hintText: 'Trip Fund',
                    ),
                    onChanged: ref
                        .read(createFundControllerProvider.notifier)
                        .updateName,
                  ),
                  const SizedBox(height: PfSpacing.md),
                  DropdownButtonFormField<String>(
                    initialValue: formState.currency,
                    items: const <DropdownMenuItem<String>>[
                      DropdownMenuItem(value: 'TWD', child: Text('TWD')),
                      DropdownMenuItem(value: 'USD', child: Text('USD')),
                    ],
                    onChanged: (value) {
                      if (value == null) {
                        return;
                      }
                      ref
                          .read(createFundControllerProvider.notifier)
                          .updateCurrency(value);
                    },
                    decoration: const InputDecoration(
                      labelText: 'Currency',
                    ),
                  ),
                  if (formState.errorMessage != null) ...<Widget>[
                    const SizedBox(height: PfSpacing.md),
                    Text(
                      formState.errorMessage!,
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
                      onPressed: formState.isSubmitting
                          ? null
                          : () async {
                              final success = await ref
                                  .read(createFundControllerProvider.notifier)
                                  .submit();
                              if (!context.mounted || !success) {
                                return;
                              }
                              context.go(AppRoutes.home);
                            },
                      child: Text(
                        formState.isSubmitting ? 'Creating...' : 'Create fund',
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
