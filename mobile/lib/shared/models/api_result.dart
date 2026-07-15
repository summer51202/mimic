class ApiResult<T> {
  const ApiResult.success(this.data)
      : errorCode = null,
        message = null;

  const ApiResult.failure({
    required this.errorCode,
    required this.message,
  }) : data = null;

  final T? data;
  final String? errorCode;
  final String? message;

  bool get isSuccess => data != null;
}
