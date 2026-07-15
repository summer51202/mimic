import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../providers/expense_form_controller.dart';

class CreateExpenseScreen extends ConsumerWidget {
  const CreateExpenseScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final ExpenseFormState formState =
        ref.watch(expenseFormControllerProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create expense'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('Create expense', style: textTheme.headlineMedium),
              const SizedBox(height: PfSpacing.sm),
              Text(
                'Record a shared fund expense with clear payer and split details.',
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Title',
                  hintText: 'Dinner, groceries, tickets...',
                ),
                onChanged: ref
                    .read(expenseFormControllerProvider(fundId).notifier)
                    .updateTitle,
              ),
              const SizedBox(height: PfSpacing.md),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  hintText: '1200',
                ),
                keyboardType: TextInputType.number,
                onChanged: ref
                    .read(expenseFormControllerProvider(fundId).notifier)
                    .updateAmount,
              ),
              const SizedBox(height: PfSpacing.lg),
              Text('Payer', style: textTheme.titleMedium),
              const SizedBox(height: PfSpacing.sm),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('Edward paid the expense', style: textTheme.bodyLarge),
                      const SizedBox(height: PfSpacing.xs),
                      Text('Single-payer MVP. Multi-payer remains schema-ready.',
                          style: textTheme.bodyMedium),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: PfSpacing.lg),
              Text('Split mode', style: textTheme.titleMedium),
              const SizedBox(height: PfSpacing.sm),
              Wrap(
                spacing: PfSpacing.sm,
                runSpacing: PfSpacing.sm,
                children: <String>['equal', 'ratio', 'fixed', 'hybrid']
                    .map(
                      (String mode) => ChoiceChip(
                        label: Text(mode),
                        selected: formState.splitMode == mode,
                        onSelected: (_) {
                          ref
                              .read(
                                expenseFormControllerProvider(fundId).notifier,
                              )
                              .updateSplitMode(mode);
                        },
                      ),
                    )
                    .toList(),
              ),
              const SizedBox(height: PfSpacing.lg),
              Text('Participants', style: textTheme.titleMedium),
              const SizedBox(height: PfSpacing.sm),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.md),
                  child: Column(
                    children: formState.participants
                        .map(
                          (participant) => ListTile(
                            contentPadding: EdgeInsets.zero,
                            title: Text(participant.name),
                            trailing: Text(participant.allocationLabel),
                          ),
                        )
                        .toList(),
                  ),
                ),
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Note',
                  hintText: 'Optional note',
                ),
                maxLines: 3,
                onChanged: ref
                    .read(expenseFormControllerProvider(fundId).notifier)
                    .updateNote,
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
                      : () {
                          ref
                              .read(
                                expenseFormControllerProvider(fundId).notifier,
                              )
                              .submit();
                        },
                  child: Text(
                    formState.isSubmitting ? 'Saving...' : 'Save expense',
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
