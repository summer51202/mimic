import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/accept_invite_controller.dart';

class AcceptInviteScreen extends ConsumerStatefulWidget {
  const AcceptInviteScreen({super.key});

  @override
  ConsumerState<AcceptInviteScreen> createState() => _AcceptInviteScreenState();
}

class _AcceptInviteScreenState extends ConsumerState<AcceptInviteScreen> {
  final TextEditingController _codeController = TextEditingController();

  @override
  void dispose() {
    _codeController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final succeeded =
        await ref.read(acceptInviteControllerProvider.notifier).submit();
    if (!mounted || !succeeded) {
      return;
    }

    final acceptedInvite =
        ref.read(acceptInviteControllerProvider).acceptedInvite;
    if (acceptedInvite == null) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Joined ${acceptedInvite.groupName}')),
    );
    context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(acceptInviteControllerProvider);
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Join a group')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Enter invite code', style: textTheme.headlineSmall),
              const SizedBox(height: PfSpacing.xs),
              Text(
                'Use the code shared by your group owner.',
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                controller: _codeController,
                enabled: !state.isSubmitting,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Invite code',
                  hintText: 'ABC123456789',
                ),
                onChanged: ref
                    .read(acceptInviteControllerProvider.notifier)
                    .updateCode,
                onSubmitted: state.isSubmitting ? null : (_) => _submit(),
              ),
              const SizedBox(height: PfSpacing.md),
              ElevatedButton(
                onPressed: state.isSubmitting ? null : _submit,
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: <Widget>[
                    if (state.isSubmitting) ...<Widget>[
                      const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          semanticsLabel: 'Joining group',
                        ),
                      ),
                      const SizedBox(width: PfSpacing.xs),
                    ],
                    const Text('Join group'),
                  ],
                ),
              ),
              if (state.errorMessage != null) ...<Widget>[
                const SizedBox(height: PfSpacing.sm),
                Text(
                  state.errorMessage!,
                  style: textTheme.bodyMedium?.copyWith(
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
