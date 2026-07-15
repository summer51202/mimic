import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class ContributionDraftPayload {
  const ContributionDraftPayload({
    required this.fundId,
    required this.contributorUserId,
    required this.amountText,
    required this.contributionType,
    required this.occurredOn,
    required this.note,
  });

  final String fundId;
  final String contributorUserId;
  final String amountText;
  final String contributionType;
  final String occurredOn;
  final String note;
}

abstract class ContributionRepository {
  Future<void> createContribution(ContributionDraftPayload payload);
}

class ContributionRepositoryException implements Exception {
  const ContributionRepositoryException(this.message);

  final String message;
}

class DemoContributionRepository implements ContributionRepository {
  @override
  Future<void> createContribution(ContributionDraftPayload payload) async {
    await Future<void>.delayed(const Duration(milliseconds: 300));
  }
}

class RemoteContributionRepository implements ContributionRepository {
  RemoteContributionRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<void> createContribution(ContributionDraftPayload payload) async {
    final amountMinor = int.tryParse(payload.amountText) ?? 0;

    await _apiClient.post(
      '/funds/${payload.fundId}/contributions',
      data: <String, dynamic>{
        'contributor_user_id': payload.contributorUserId,
        'amount_minor': amountMinor,
        'contribution_type': payload.contributionType,
        'occurred_on': payload.occurredOn,
        if (payload.note.trim().isNotEmpty) 'note': payload.note.trim(),
      },
    );
  }
}

final contributionRepositoryProvider = Provider<ContributionRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteContributionRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoContributionRepository();
});
