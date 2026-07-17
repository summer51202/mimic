import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../shared/constants/design_tokens.dart';
import '../data/invite_repository.dart';
import '../providers/create_invite_controller.dart';

class CreateInviteScreen extends ConsumerStatefulWidget {
  const CreateInviteScreen({
    required this.groupId,
    super.key,
  });

  final String groupId;

  @override
  ConsumerState<CreateInviteScreen> createState() => _CreateInviteScreenState();
}

class _CreateInviteScreenState extends ConsumerState<CreateInviteScreen> {
  final TextEditingController _emailController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    await ref
        .read(createInviteControllerProvider(widget.groupId).notifier)
        .submit();
  }

  Future<void> _copyCode(String code) async {
    await Clipboard.setData(ClipboardData(text: code));
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invite code copied')),
    );
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(createInviteControllerProvider(widget.groupId));
    final textTheme = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Invite member')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              Text('Create an invite', style: textTheme.headlineSmall),
              const SizedBox(height: PfSpacing.xs),
              Text(
                'Share a one-time code with the person joining your group.',
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: PfSpacing.lg),
              TextField(
                controller: _emailController,
                enabled: !state.isSubmitting,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Email (optional)',
                  hintText: 'partner@example.com',
                ),
                onChanged: ref
                    .read(
                        createInviteControllerProvider(widget.groupId).notifier)
                    .updateEmail,
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
                          semanticsLabel: 'Creating invite',
                        ),
                      ),
                      const SizedBox(width: PfSpacing.xs),
                    ],
                    const Text('Create invite'),
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
              if (state.invite case final CreatedInvite invite) ...<Widget>[
                const SizedBox(height: PfSpacing.lg),
                Card(
                  color: PfColors.successSoft,
                  child: Padding(
                    padding: const EdgeInsets.all(PfSpacing.md),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: <Widget>[
                        Text('Invite code', style: textTheme.titleMedium),
                        const SizedBox(height: PfSpacing.xs),
                        SelectableText(
                          invite.code,
                          style: textTheme.headlineSmall,
                        ),
                        const SizedBox(height: PfSpacing.sm),
                        Text('Expires ${_formatExpiry(invite.expiresAt)}'),
                        const SizedBox(height: PfSpacing.md),
                        OutlinedButton.icon(
                          onPressed: () => _copyCode(invite.code),
                          icon: const Icon(Icons.copy),
                          label: const Text('Copy code'),
                        ),
                      ],
                    ),
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

String _formatExpiry(DateTime value) {
  return DateFormat.yMMMd().add_jm().format(value.toLocal());
}
