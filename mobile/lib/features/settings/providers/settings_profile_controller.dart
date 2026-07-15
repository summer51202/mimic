import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/settings_repository.dart';

class SettingsProfileState {
  const SettingsProfileState({
    this.profile,
    this.displayNameDraft = '',
    this.localeDraft = 'zh-TW',
    this.timezoneDraft = 'Asia/Taipei',
    this.isLoading = false,
    this.isSaving = false,
    this.errorMessage,
  });

  final SettingsProfile? profile;
  final String displayNameDraft;
  final String localeDraft;
  final String timezoneDraft;
  final bool isLoading;
  final bool isSaving;
  final String? errorMessage;

  SettingsProfileState copyWith({
    SettingsProfile? profile,
    String? displayNameDraft,
    String? localeDraft,
    String? timezoneDraft,
    bool? isLoading,
    bool? isSaving,
    String? errorMessage,
    bool clearError = false,
  }) {
    return SettingsProfileState(
      profile: profile ?? this.profile,
      displayNameDraft: displayNameDraft ?? this.displayNameDraft,
      localeDraft: localeDraft ?? this.localeDraft,
      timezoneDraft: timezoneDraft ?? this.timezoneDraft,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
    );
  }
}

class SettingsProfileController extends StateNotifier<SettingsProfileState> {
  SettingsProfileController(this._ref) : super(const SettingsProfileState());

  final Ref _ref;

  Future<void> load() async {
    state = state.copyWith(isLoading: true, clearError: true);

    try {
      final profile = await _ref.read(settingsRepositoryProvider).fetchProfile();
      state = state.copyWith(
        profile: profile,
        displayNameDraft: profile.displayName,
        localeDraft: profile.locale,
        timezoneDraft: profile.timezone,
        isLoading: false,
        clearError: true,
      );
    } catch (_) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unable to load settings right now.',
      );
    }
  }

  void updateDisplayName(String value) {
    state = state.copyWith(displayNameDraft: value);
  }

  void updateLocale(String value) {
    state = state.copyWith(localeDraft: value);
  }

  void updateTimezone(String value) {
    state = state.copyWith(timezoneDraft: value);
  }

  Future<bool> save() async {
    if (state.displayNameDraft.trim().isEmpty) {
      state = state.copyWith(errorMessage: 'Display name is required.');
      return false;
    }

    state = state.copyWith(isSaving: true, clearError: true);

    try {
      final updatedProfile =
          await _ref.read(settingsRepositoryProvider).updateProfile(
                SettingsProfilePatch(
                  displayName: state.displayNameDraft.trim(),
                  locale: state.localeDraft,
                  timezone: state.timezoneDraft,
                ),
              );
      state = state.copyWith(
        profile: updatedProfile,
        displayNameDraft: updatedProfile.displayName,
        localeDraft: updatedProfile.locale,
        timezoneDraft: updatedProfile.timezone,
        isSaving: false,
        clearError: true,
      );
      return true;
    } catch (_) {
      state = state.copyWith(
        isSaving: false,
        errorMessage: 'Unable to save settings right now.',
      );
      return false;
    }
  }
}

final settingsProfileControllerProvider = StateNotifierProvider.autoDispose<
    SettingsProfileController, SettingsProfileState>((Ref ref) {
  return SettingsProfileController(ref);
});
