import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/dio_provider.dart';
import 'api_exception_mapper.dart';

abstract class PairFundApiClient {
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  });

  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  });
}

abstract class PairFundPatchApiClient {
  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  });
}

abstract class PairFundDeleteApiClient {
  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? data,
  });
}

abstract class PairFundGroupApiClient
    implements
        PairFundApiClient,
        PairFundPatchApiClient,
        PairFundDeleteApiClient {}

class DioPairFundApiClient implements PairFundGroupApiClient {
  DioPairFundApiClient(this._dio);

  final Dio _dio;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        path,
        queryParameters: queryParameters,
      );

      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw mapDioExceptionToApiException(error);
    }
  }

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );

      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw mapDioExceptionToApiException(error);
    }
  }

  @override
  Future<Map<String, dynamic>> patch(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    try {
      final response = await _dio.patch<Map<String, dynamic>>(
        path,
        data: data,
        queryParameters: queryParameters,
      );
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw mapDioExceptionToApiException(error);
    }
  }

  @override
  Future<Map<String, dynamic>> delete(
    String path, {
    Map<String, dynamic>? data,
  }) async {
    try {
      final response = await _dio.delete<Map<String, dynamic>>(
        path,
        data: data,
      );
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw mapDioExceptionToApiException(error);
    }
  }
}

final pairFundGroupApiClientProvider =
    Provider<PairFundGroupApiClient>((Ref ref) {
  return DioPairFundApiClient(ref.watch(dioProvider));
});

final pairFundApiClientProvider = Provider<PairFundApiClient>((Ref ref) {
  return ref.watch(pairFundGroupApiClientProvider);
});
