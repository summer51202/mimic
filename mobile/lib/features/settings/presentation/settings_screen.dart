import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/constants/design_tokens.dart';
import '../../auth/providers/auth_controller.dart';
import '../providers/settings_profile_controller.dart';

class SettingsScreen extends ConsumerStatefulWidget {
  const SettingsScreen({super.key});

  @override
  ConsumerState<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends ConsumerState<SettingsScreen> {
  final TextEditingController _displayNameController = TextEditingController();
  final TextEditingController _localeController = TextEditingController();
  final TextEditingController _timezoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    Future<void>.microtask(() async {
      await ref.read(settingsProfileControllerProvider.notifier).load();
      _syncControllersFromState();
    });
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _localeController.dispose();
    _timezoneController.dispose();
    super.dispose();
  }

  void _syncControllersFromState() {
    final state = ref.read(settingsProfileControllerProvider);
    _displayNameController.text = state.displayNameDraft;
    _localeController.text = state.localeDraft;
    _timezoneController.text = state.timezoneDraft;
  }

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;
    final SettingsProfileState state =
        ref.watch(settingsProfileControllerProvider);

    ref.listen<SettingsProfileState>(settingsProfileControllerProvider, (
      previous,
      next,
    ) {
      if (previous?.profile != next.profile && next.profile != null) {
        _displayNameController.text = next.displayNameDraft;
        _localeController.text = next.localeDraft;
        _timezoneController.text = next.timezoneDraft;
      }
    });

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        backgroundColor: Colors.transparent,
      ),
      body: ListView(
        padding: const EdgeInsets.all(PfSpacing.md),
        children: <Widget>[
          Card(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Account', style: textTheme.titleLarge),
                  const SizedBox(height: PfSpacing.sm),
                  if (state.isLoading)
                    const ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: Text('Loading settings...'),
                    )
                  else ...<Widget>[
                    ListTile(
                      contentPadding: EdgeInsets.zero,
                      title: const Text('Email'),
                      subtitle: Text(state.profile?.email ?? 'Not loaded'),
                    ),
                    TextField(
                      key: const Key('settings-display-name'),
                      controller: _displayNameController,
                      decoration: const InputDecoration(
                        labelText: 'Display name',
                      ),
                      onChanged: ref
                          .read(settingsProfileControllerProvider.notifier)
                          .updateDisplayName,
                    ),
                    const SizedBox(height: PfSpacing.md),
                    TextField(
                      key: const Key('settings-locale'),
                      controller: _localeController,
                      decoration: const InputDecoration(
                        labelText: 'Locale',
                        hintText: 'zh-TW',
                      ),
                      onChanged: ref
                          .read(settingsProfileControllerProvider.notifier)
                          .updateLocale,
                    ),
                    const SizedBox(height: PfSpacing.md),
                    TextField(
                      key: const Key('settings-timezone'),
                      controller: _timezoneController,
                      decoration: const InputDecoration(
                        labelText: 'Timezone',
                        hintText: 'Asia/Taipei',
                      ),
                      onChanged: ref
                          .read(settingsProfileControllerProvider.notifier)
                          .updateTimezone,
                    ),
                  ],
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
                  const SizedBox(height: PfSpacing.lg),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: state.isLoading || state.isSaving
                          ? null
                          : () async {
                              final success = await ref
                                  .read(
                                    settingsProfileControllerProvider.notifier,
                                  )
                                  .save();
                              if (!context.mounted) {
                                return;
                              }
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                    success
                                        ? 'Settings saved.'
                                        : 'Unable to save settings right now.',
                                  ),
                                ),
                              );
                            },
                      child: Text(
                        state.isSaving ? 'Saving...' : 'Save settings',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: PfSpacing.md),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(PfSpacing.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text('Preferences', style: textTheme.titleLarge),
                  const SizedBox(height: PfSpacing.sm),
                  const ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Settlement reminders'),
                    subtitle: Text('Enabled'),
                  ),
                  const ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text('Recurring contribution prompts'),
                    subtitle: Text('Enabled'),
                  ),
                  const SizedBox(height: PfSpacing.xs),
                  Text(
                    'Preference sync will be added after the profile flow is stable.',
                    style: textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: PfSpacing.md),
          FilledButton.tonal(
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
            },
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
  }
}
