import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/contributions/data/contribution_repository.dart';
import 'package:pairfund_mobile/features/contributions/providers/contribution_form_controller.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';

class ThrowingContributionRepository implements ContributionRepository {
  @override
  Future<void> createContribution(ContributionDraftPayload payload) async {
    throw const ContributionRepositoryException('Contribution API unavailable');
  }
}

void main() {
  test('submit resets loading state and exposes repository error', () async {
    final container = ProviderContainer(
      overrides: <Override>[
        contributionRepositoryProvider.overrideWith((ref) {
          return ThrowingContributionRepository();
        }),
      ],
    );
    addTearDown(container.dispose);

    container.read(sessionProvider.notifier).setSession(
          accessToken: 'token',
          refreshToken: 'refresh',
          userId: 'user-a',
        );

    final notifier = container
        .read(contributionFormControllerProvider('fund-date').notifier);

    notifier.updateAmount('1000');
    notifier.updateNote('Monthly contribution');

    final bool success = await notifier.submit();
    final ContributionFormState state =
        container.read(contributionFormControllerProvider('fund-date'));

    expect(success, isFalse);
    expect(state.isSubmitting, isFalse);
    expect(state.errorMessage, 'Contribution API unavailable');
    expect(state.note, 'Monthly contribution');
  });
}
