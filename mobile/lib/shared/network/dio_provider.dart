import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../providers/session_provider.dart';
import '../storage/session_persistence.dart';

typedef RefreshSessionCallback = Future<SessionState?> Function(
  String refreshToken,
);

Dio buildDioClient(
  String baseUrl, {
  String? accessToken,
  String? refreshToken,
  RefreshSessionCallback? refreshSession,
  Future<void> Function(SessionState session)? onSessionRefreshed,
  Future<void> Function()? onRefreshFailed,
}) {
  final normalizedAccessToken = accessToken?.trim();
  final Dio dio = Dio(
    BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      sendTimeout: const Duration(seconds: 10),
      headers: <String, Object?>{
        if (normalizedAccessToken != null && normalizedAccessToken.isNotEmpty)
          'Authorization': 'Bearer $normalizedAccessToken',
      },
    ),
  );

  if (refreshToken != null &&
      refreshToken.trim().isNotEmpty &&
      refreshSession != null) {
    dio.interceptors.add(
      _AuthRefreshInterceptor(
        dio: dio,
        refreshToken: refreshToken,
        refreshSession: refreshSession,
        onSessionRefreshed: onSessionRefreshed,
        onRefreshFailed: onRefreshFailed,
      ),
    );
  }

  return dio;
}

class _AuthRefreshInterceptor extends Interceptor {
  _AuthRefreshInterceptor({
    required this.dio,
    required this.refreshToken,
    required this.refreshSession,
    this.onSessionRefreshed,
    this.onRefreshFailed,
  });

  final Dio dio;
  final String refreshToken;
  final RefreshSessionCallback refreshSession;
  final Future<void> Function(SessionState session)? onSessionRefreshed;
  final Future<void> Function()? onRefreshFailed;

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    final response = err.response;
    final requestOptions = err.requestOptions;
    final isUnauthorized = response?.statusCode == 401;
    final isRefreshRequest = requestOptions.path == '/auth/refresh';
    final alreadyRetried = requestOptions.extra['retriedAfterRefresh'] == true;

    if (!isUnauthorized || isRefreshRequest || alreadyRetried) {
      handler.next(err);
      return;
    }

    try {
      final refreshedSession = await refreshSession(refreshToken);
      if (refreshedSession == null || refreshedSession.accessToken == null) {
        await onRefreshFailed?.call();
        handler.next(err);
        return;
      }

      await onSessionRefreshed?.call(refreshedSession);

      final updatedHeaders = Map<String, dynamic>.from(requestOptions.headers)
        ..['Authorization'] = 'Bearer ${refreshedSession.accessToken}';
      dio.options.headers['Authorization'] =
          'Bearer ${refreshedSession.accessToken}';

      final retriedResponse = await dio.fetch<dynamic>(
        requestOptions.copyWith(
          headers: updatedHeaders,
          extra: <String, dynamic>{
            ...requestOptions.extra,
            'retriedAfterRefresh': true,
          },
        ),
      );

      handler.resolve(retriedResponse);
    } catch (_) {
      await onRefreshFailed?.call();
      handler.next(err);
    }
  }
}

final apiBaseUrlProvider = Provider<String>((Ref ref) {
  return appConfig.apiBaseUrl;
});

final dioProvider = Provider<Dio>((Ref ref) {
  final String baseUrl = ref.watch(apiBaseUrlProvider);
  final SessionState session = ref.watch(sessionProvider);

  return buildDioClient(
    baseUrl,
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    refreshSession: (String refreshToken) async {
      final refreshDio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 10),
          sendTimeout: const Duration(seconds: 10),
        ),
      );
      final response = await refreshDio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: <String, dynamic>{
          'refresh_token': refreshToken,
        },
      );
      final data = response.data?['data'];
      if (data is! Map<String, dynamic>) {
        return null;
      }

      final userJson = data['user'];
      final fallbackUserId = session.userId;
      final userId = userJson is Map<String, dynamic>
          ? userJson['id'] as String? ?? fallbackUserId
          : fallbackUserId;
      final accessToken = data['access_token'] as String?;
      final nextRefreshToken =
          data['refresh_token'] as String? ?? refreshToken;

      if (accessToken == null || userId == null) {
        return null;
      }

      return SessionState(
        accessToken: accessToken,
        refreshToken: nextRefreshToken,
        userId: userId,
      );
    },
    onSessionRefreshed: (SessionState refreshedSession) async {
      ref.read(sessionProvider.notifier).setSession(
            accessToken: refreshedSession.accessToken!,
            refreshToken: refreshedSession.refreshToken ?? '',
            userId: refreshedSession.userId!,
          );
      await ref.read(sessionPersistenceProvider).saveSession(refreshedSession);
    },
    onRefreshFailed: () async {
      ref.read(sessionProvider.notifier).clear();
      await ref.read(sessionPersistenceProvider).clearSession();
    },
  );
});
