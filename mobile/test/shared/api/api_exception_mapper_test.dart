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

  test('maps an empty top-level message to an API error', () {
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

    expect(mapped.code, 'API_ERROR');
    expect(mapped.message, 'Request failed');
    expect(mapped.statusCode, 403);
  });

  test('joins NestJS validation messages into an API error', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/group-invites'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/group-invites'),
        statusCode: 400,
        data: <String, dynamic>{
          'message': <String>['email must be valid', 'email is required'],
        },
      ),
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'API_ERROR');
    expect(mapped.message, 'email must be valid; email is required');
    expect(mapped.statusCode, 400);
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

  test('uses nested code when its message is empty', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/funds'),
      response: Response<Map<String, dynamic>>(
        requestOptions: RequestOptions(path: '/funds'),
        statusCode: 409,
        data: <String, dynamic>{
          'error': <String, dynamic>{'code': 'FUND_LOCKED', 'message': ''},
        },
      ),
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'FUND_LOCKED');
    expect(mapped.message, 'FUND_LOCKED');
    expect(mapped.statusCode, 409);
  });

  for (final nestedError in <Map<String, dynamic>>[
    <String, dynamic>{},
    <String, dynamic>{'message': 'Nested without code'},
    <String, dynamic>{'code': '', 'message': 'Nested empty code'},
    <String, dynamic>{
      'code': <String>['INVALID_CODE']
    },
  ]) {
    test('ignores nested error without a non-empty string code: $nestedError',
        () {
      final error = DioException(
        requestOptions: RequestOptions(path: '/group-invites/accept'),
        response: Response<Map<String, dynamic>>(
          requestOptions: RequestOptions(path: '/group-invites/accept'),
          statusCode: 403,
          data: <String, dynamic>{
            'message': 'INVITE_EMAIL_MISMATCH',
            'error': nestedError,
          },
        ),
      );

      final mapped = mapDioExceptionToApiException(error);

      expect(mapped.code, 'INVITE_EMAIL_MISMATCH');
      expect(mapped.message, 'INVITE_EMAIL_MISMATCH');
      expect(mapped.statusCode, 403);
    });
  }

  test('maps a non-map HTTP body to an API error', () {
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

    expect(mapped.code, 'API_ERROR');
    expect(mapped.message, 'Request failed');
    expect(mapped.statusCode, 500);
  });

  test('maps a DioException without a response to a network error', () {
    final error = DioException(
      requestOptions: RequestOptions(path: '/funds'),
      message: 'Connection timed out',
    );

    final mapped = mapDioExceptionToApiException(error);

    expect(mapped.code, 'NETWORK_ERROR');
    expect(mapped.message, 'Connection timed out');
    expect(mapped.statusCode, isNull);
  });
}
