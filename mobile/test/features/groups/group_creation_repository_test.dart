import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/groups/data/group_creation_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class _RecordingApiClient implements PairFundApiClient {
  String? postPath;
  Map<String, dynamic>? postData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    postPath = path;
    postData = data;
    return <String, dynamic>{
      'data': <String, dynamic>{
        'id': 'group-2',
        'name': 'Summer Trip',
        'group_type': 'group',
        'default_currency': 'TWD',
      },
    };
  }
}

void main() {
  test('remote repository posts the group contract and maps its result',
      () async {
    final api = _RecordingApiClient();
    final repository = RemoteGroupCreationRepository(api);

    final group = await repository.createGroup(
      const CreateGroupDraft(
        name: 'Summer Trip',
        groupType: 'group',
        defaultCurrency: 'TWD',
      ),
    );

    expect(api.postPath, '/groups');
    expect(api.postData, <String, dynamic>{
      'name': 'Summer Trip',
      'group_type': 'group',
      'default_currency': 'TWD',
    });
    expect(group.id, 'group-2');
    expect(group.name, 'Summer Trip');
  });
}
