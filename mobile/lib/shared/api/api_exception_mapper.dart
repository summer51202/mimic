import 'package:dio/dio.dart';

import 'api_exception.dart';

ApiException mapDioExceptionToApiException(DioException error) {
  final responseData = error.response?.data;

  if (responseData is Map<String, dynamic>) {
    final errorPayload = responseData['error'];
    if (errorPayload is Map<String, dynamic>) {
      return ApiException(
        code: '${errorPayload['code'] ?? 'API_ERROR'}',
        message: '${errorPayload['message'] ?? 'Request failed'}',
        statusCode: error.response?.statusCode,
      );
    }

    final message = responseData['message'];
    if (message is String && message.isNotEmpty) {
      return ApiException(
        code: message,
        message: message,
        statusCode: error.response?.statusCode,
      );
    }
  }

  return ApiException(
    code: 'NETWORK_ERROR',
    message: error.message ?? 'Request failed',
    statusCode: error.response?.statusCode,
  );
}
