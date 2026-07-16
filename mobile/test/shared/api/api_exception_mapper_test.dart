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

  test('maps NestJS top-level message to ApiException', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/group-invites/accept'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/group-invites/accept'),
        statusCode: 403,
        data: <String, dynamic>{
          'statusCode': 403,
          'message': 'INVITE_EMAIL_MISMATCH',
          'error': 'Forbidden',
        },
      ),
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'INVITE_EMAIL_MISMATCH');
    expect(mapped.message, 'INVITE_EMAIL_MISMATCH');
    expect(mapped.statusCode, 403);
  });

  test('does not replace fallback with an empty top-level message', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/group-invites/accept'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/group-invites/accept'),
        statusCode: 403,
        data: <String, dynamic>{'message': ''},
      ),
      message: 'Request failed',
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'NETWORK_ERROR');
    expect(mapped.message, 'Request failed');
    expect(mapped.statusCode, 403);
  });

  test('prefers nested API error over a top-level message', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/group-invites/accept'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/group-invites/accept'),
        statusCode: 409,
        data: <String, dynamic>{
          'message': 'TOP_LEVEL_ERROR',
          'error': <String, dynamic>{
            'code': 'NESTED_ERROR',
            'message': 'Nested error message',
          },
        },
      ),
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'NESTED_ERROR');
    expect(mapped.message, 'Nested error message');
    expect(mapped.statusCode, 409);
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
