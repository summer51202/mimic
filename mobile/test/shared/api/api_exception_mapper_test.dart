import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';
import 'package:pairfund_mobile/shared/api/api_exception_mapper.dart';

void main() {
  test('maps structured API error payload to ApiException', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/funds'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/funds'),
        statusCode: 401,
        data: <String, dynamic>{
          'error': <String, dynamic>{
            'code': 'UNAUTHORIZED',
            'message': 'Token expired',
          },
        },
      ),
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped, isA<ApiException>());
    expect(mapped.code, 'UNAUTHORIZED');
    expect(mapped.message, 'Token expired');
    expect(mapped.statusCode, 401);
  });

  test('falls back to network error when payload is missing', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/funds'),
      response: Response<String>(
        requestOptions: RequestOptions(path: '/funds'),
        statusCode: 500,
        data: 'server exploded',
      ),
      message: 'Request failed',
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'NETWORK_ERROR');
    expect(mapped.message, 'Request failed');
    expect(mapped.statusCode, 500);
  });
}
