import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/providers/session_provider.dart';
import 'package:pairfund_mobile/shared/network/dio_provider.dart';

class FakeHttpClientAdapter implements HttpClientAdapter {
  int protectedRequestCount = 0;
  String? retriedAuthorizationHeader;

  @override
  void close({bool force = false}) {}

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (options.path == '/protected') {
      protectedRequestCount += 1;

      if (protectedRequestCount == 1) {
        return ResponseBody.fromString(
          '{"error":{"code":"UNAUTHORIZED"}}',
          401,
          headers: <String, List<String>>{
            Headers.contentTypeHeader: <String>['application/json'],
          },
        );
      }

      retriedAuthorizationHeader = '${options.headers['Authorization']}';
      return ResponseBody.fromString(
        jsonEncode(<String, dynamic>{
          'data': <String, dynamic>{'ok': true},
        }),
        200,
        headers: <String, List<String>>{
          Headers.contentTypeHeader: <String>['application/json'],
        },
      );
    }

    return ResponseBody.fromString(
      '{}',
      404,
      headers: <String, List<String>>{
        Headers.contentTypeHeader: <String>['application/json'],
      },
    );
  }
}

void main() {
  test('provides dio instance with base URL', () {
    final dio = buildDioClient('http://localhost');

    expect(dio.options.baseUrl, 'http://localhost');
  });

  test('attaches bearer token when available', () {
    final dio = buildDioClient(
      'http://localhost',
      accessToken: 'token-123',
    );

    expect(dio.options.headers['Authorization'], 'Bearer token-123');
  });

  test('does not attach authorization header for blank token', () {
    final dio = buildDioClient(
      'http://localhost',
      accessToken: '',
    );

    expect(dio.options.headers.containsKey('Authorization'), isFalse);
  });

  test('refreshes session and retries request after unauthorized response', () async {
    final adapter = FakeHttpClientAdapter();
    SessionState? refreshedSession;
    bool refreshFailed = false;
    final dio = buildDioClient(
      'http://localhost',
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      refreshSession: (refreshToken) async {
        expect(refreshToken, 'refresh-token');
        return const SessionState(
          accessToken: 'new-token',
          refreshToken: 'new-refresh-token',
          userId: 'user-1',
        );
      },
      onSessionRefreshed: (session) async {
        refreshedSession = session;
      },
      onRefreshFailed: () async {
        refreshFailed = true;
      },
    )..httpClientAdapter = adapter;

    final response = await dio.get<Map<String, dynamic>>('/protected');

    expect(response.statusCode, 200);
    expect(adapter.protectedRequestCount, 2);
    expect(adapter.retriedAuthorizationHeader, 'Bearer new-token');
    expect(refreshedSession?.accessToken, 'new-token');
    expect(refreshFailed, isFalse);
  });

  test('calls refresh failed handler when refresh cannot produce session', () async {
    final adapter = FakeHttpClientAdapter();
    bool refreshFailed = false;
    final dio = buildDioClient(
      'http://localhost',
      accessToken: 'old-token',
      refreshToken: 'refresh-token',
      refreshSession: (_) async => null,
      onRefreshFailed: () async {
        refreshFailed = true;
      },
    )..httpClientAdapter = adapter;

    await expectLater(
      dio.get<Map<String, dynamic>>('/protected'),
      throwsA(isA<DioException>()),
    );

    expect(adapter.protectedRequestCount, 1);
    expect(refreshFailed, isTrue);
  });
}
