import 'package:dio/dio.dart';

import 'api_exception.dart';

ApiException mapDioExceptionToApiException(DioException error) {
  final response = error.response;
  if (response == null) {
    return ApiException(
      code: 'NETWORK_ERROR',
      message: error.message ?? 'Request failed',
    );
  }

  final responseData = response.data;

  if (responseData is Map<String, dynamic>) {
    final errorPayload = responseData['error'];
    if (errorPayload is Map<String, dynamic>) {
      final code = errorPayload['code'];
      if (code is String && code.isNotEmpty) {
        final nestedMessage = errorPayload['message'];
        return ApiException(
          code: code,
          message: nestedMessage is String && nestedMessage.isNotEmpty
              ? nestedMessage
              : code,
          statusCode: response.statusCode,
        );
      }
    }

    final message = responseData['message'];
    if (message is String && message.isNotEmpty) {
      return ApiException(
        code: message,
        message: message,
        statusCode: response.statusCode,
      );
    }

    if (message is List && message.every((item) => item is String)) {
      final joinedMessage = message
          .whereType<String>()
          .where((item) => item.isNotEmpty)
          .join('; ');
      if (joinedMessage.isNotEmpty) {
        return ApiException(
          code: 'API_ERROR',
          message: joinedMessage,
          statusCode: response.statusCode,
        );
      }
    }
  }

  return ApiException(
    code: 'API_ERROR',
    message: error.message ?? 'Request failed',
    statusCode: response.statusCode,
  );
}
