import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class CreateFundDraft {
  const CreateFundDraft({
    required this.name,
    required this.currency,
  });

  final String name;
  final String currency;
}

class CreatedFund {
  const CreatedFund({
    required this.id,
    required this.name,
    required this.currency,
  });

  final String id;
  final String name;
  final String currency;
}

class FundCreationException implements Exception {
  const FundCreationException(this.message);

  final String message;
}

abstract class FundCreationRepository {
  Future<CreatedFund> createFund(CreateFundDraft draft);
}

class DemoFundCreationRepository implements FundCreationRepository {
  @override
  Future<CreatedFund> createFund(CreateFundDraft draft) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return CreatedFund(
      id: 'fund-demo',
      name: draft.name,
      currency: draft.currency,
    );
  }
}

class RemoteFundCreationRepository implements FundCreationRepository {
  RemoteFundCreationRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<CreatedFund> createFund(CreateFundDraft draft) async {
    final groupsResponse = await _apiClient.get('/groups');
    final groups = readDataListEnvelope(groupsResponse);

    if (groups.isEmpty) {
      throw const FundCreationException('No group is available for this account.');
    }

    final groupId = '${groups.first['id'] ?? ''}';
    if (groupId.isEmpty) {
      throw const FundCreationException(
        'Unable to determine which group should own this fund.',
      );
    }

    final response = await _apiClient.post(
      '/groups/$groupId/funds',
      data: <String, dynamic>{
        'name': draft.name,
        'currency': draft.currency,
      },
    );

    final data = readDataEnvelope(response);

    return CreatedFund(
      id: '${data['id'] ?? 'fund-created'}',
      name: '${data['name'] ?? draft.name}',
      currency: '${data['currency'] ?? draft.currency}',
    );
  }
}

final fundCreationRepositoryProvider = Provider<FundCreationRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteFundCreationRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoFundCreationRepository();
});
