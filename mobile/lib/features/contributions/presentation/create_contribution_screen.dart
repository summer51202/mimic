import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../providers/contribution_form_controller.dart';

class CreateContributionScreen extends ConsumerWidget {
  const CreateContributionScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final textTheme = Theme.of(context).textTheme;
    final formState = ref.watch(contributionFormControllerProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create contribution'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Card(
                color: PfColors.successSoft,
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('Add a contribution', style: textTheme.titleLarge),
                      const SizedBox(height: PfSpacing.sm),
                      Text(
                        'Record money added into this shared fund.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  hintText: '1000',
                ),
                keyboardType: TextInputType.number,
                onChanged: ref
                    .read(contributionFormControllerProvider(fundId).notifier)
                    .updateAmount,
              ),
              const SizedBox(height: PfSpacing.md),
              DropdownButtonFormField<String>(
                initialValue: formState.contributionType,
                items: const <DropdownMenuItem<String>>[
                  DropdownMenuItem(
                    value: 'one_time',
                    child: Text('One time'),
                  ),
                  DropdownMenuItem(
                    value: 'regular',
                    child: Text('Regular'),
                  ),
                ],
                onChanged: (value) {
                  if (value == null) {
                    return;
                  }
                  ref
                      .read(contributionFormControllerProvider(fundId).notifier)
                      .updateContributionType(value);
                },
                decoration: const InputDecoration(
                  labelText: 'Contribution type',
                ),
              ),
              const SizedBox(height: PfSpacing.md),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Note',
                  hintText: 'Optional note',
                ),
                maxLines: 3,
                onChanged: ref
                    .read(contributionFormControllerProvider(fundId).notifier)
                    .updateNote,
              ),
              const SizedBox(height: PfSpacing.md),
              Text(
                'Date: ${formState.occurredOn}',
                style: textTheme.bodyMedium,
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
                              .read(
                                contributionFormControllerProvider(fundId)
                                    .notifier,
                              )
                              .submit();
                          if (!context.mounted) {
                            return;
                          }
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(
                                success
                                    ? 'Contribution saved.'
                                    : 'Unable to save this contribution right now.',
                              ),
                            ),
                          );
                        },
                  child: Text(
                    formState.isSubmitting ? 'Saving...' : 'Save contribution',
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
