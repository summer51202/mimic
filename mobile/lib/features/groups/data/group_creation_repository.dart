import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class CreateGroupDraft {
  const CreateGroupDraft({
    required this.name,
    required this.groupType,
    required this.defaultCurrency,
  });

  final String name;
  final String groupType;
  final String defaultCurrency;
}

class CreatedGroup {
  const CreatedGroup({
    required this.id,
    required this.name,
    required this.groupType,
    required this.defaultCurrency,
  });

  final String id;
  final String name;
  final String groupType;
  final String defaultCurrency;
}

abstract class GroupCreationRepository {
  Future<CreatedGroup> createGroup(CreateGroupDraft draft);
}

class DemoGroupCreationRepository implements GroupCreationRepository {
  @override
  Future<CreatedGroup> createGroup(CreateGroupDraft draft) async {
    return CreatedGroup(
      id: 'group-created',
      name: draft.name,
      groupType: draft.groupType,
      defaultCurrency: draft.defaultCurrency,
    );
  }
}

class RemoteGroupCreationRepository implements GroupCreationRepository {
  RemoteGroupCreationRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<CreatedGroup> createGroup(CreateGroupDraft draft) async {
    final response = await _apiClient.post(
      '/groups',
      data: <String, dynamic>{
        'name': draft.name,
        'group_type': draft.groupType,
        'default_currency': draft.defaultCurrency,
      },
    );
    final data = readDataEnvelope(response);
    return CreatedGroup(
      id: '${data['id'] ?? ''}',
      name: '${data['name'] ?? draft.name}',
      groupType: '${data['group_type'] ?? draft.groupType}',
      defaultCurrency: '${data['default_currency'] ?? draft.defaultCurrency}',
    );
  }
}

final groupCreationRepositoryProvider = Provider<GroupCreationRepository>(
  (Ref ref) {
    if (ref.watch(apiModeProvider) == AppApiMode.remote) {
      return RemoteGroupCreationRepository(
          ref.watch(pairFundApiClientProvider));
    }
    return DemoGroupCreationRepository();
  },
);
