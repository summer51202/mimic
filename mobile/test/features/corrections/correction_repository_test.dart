import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/corrections/data/correction_repository.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';

class RecordingApiClient implements PairFundApiClient {
  RecordingApiClient(this._responses);

  final Map<String, Map<String, dynamic>> _responses;
  String? lastPostPath;
  Map<String, dynamic>? lastPostData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for GET $path');
    }
    return response;
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    lastPostPath = path;
    lastPostData = data;
    final response = _responses[path];
    if (response == null) {
      throw StateError('Missing fake response for POST $path');
    }
    return response;
  }
}

void main() {
  test('remote correction repository posts correction expense payload', () async {
    final apiClient = RecordingApiClient(
      <String, Map<String, dynamic>>{
        '/funds/fund-1/expenses': <String, dynamic>{
          'data': <String, dynamic>{
            'id': 'expense-1',
            'expense_type': 'correction',
          },
        },
      },
    );
    final repository = RemoteCorrectionRepository(apiClient);

    await repository.createCorrection(
      const CorrectionDraft(
        fundId: 'fund-1',
        title: 'Correction for March dinner split difference',
        amountText: '200',
        note: 'Adjusted after settlement lock.',
      ),
    );

    expect(apiClient.lastPostPath, '/funds/fund-1/expenses');
    expect(apiClient.lastPostData?['expense_type'], 'correction');
    expect(apiClient.lastPostData?['title'], 'Correction for March dinner split difference');
    expect(apiClient.lastPostData?['amount_minor'], 200);
  });
}
