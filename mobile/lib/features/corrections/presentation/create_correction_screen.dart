import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../providers/correction_form_controller.dart';

class CreateCorrectionScreen extends ConsumerWidget {
  const CreateCorrectionScreen({
    super.key,
    required this.fundId,
  });

  final String fundId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final formState = ref.watch(correctionFormControllerProvider(fundId));

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create correction'),
        backgroundColor: Colors.transparent,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Card(
                color: PfColors.warningSoft,
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.md),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text(
                        'Original record stays unchanged',
                        style: textTheme.titleMedium,
                      ),
                      const SizedBox(height: PfSpacing.xs),
                      Text(
                        'Use a correction transaction when the settled period is locked. Explain the reason clearly in the title.',
                        style: textTheme.bodyMedium,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Correction title',
                  hintText: 'Correction for March dinner split difference',
                ),
                onChanged: ref
                    .read(correctionFormControllerProvider(fundId).notifier)
                    .updateTitle,
              ),
              const SizedBox(height: PfSpacing.md),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Amount',
                  hintText: '200',
                ),
                keyboardType: TextInputType.number,
                onChanged: ref
                    .read(correctionFormControllerProvider(fundId).notifier)
                    .updateAmount,
              ),
              const SizedBox(height: PfSpacing.md),
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Note',
                  hintText: 'Optional explanation',
                ),
                maxLines: 3,
                onChanged: ref
                    .read(correctionFormControllerProvider(fundId).notifier)
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
                                correctionFormControllerProvider(fundId)
                                    .notifier,
                              )
                              .submit();
                        },
                  child: Text(
                    formState.isSubmitting ? 'Saving...' : 'Save correction',
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
