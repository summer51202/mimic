enum AppApiMode {
  demo,
  remote,
}

class AppConfig {
  const AppConfig({
    required this.apiMode,
    required this.apiBaseUrl,
  });

  final AppApiMode apiMode;
  final String apiBaseUrl;
}

const String defaultApiBaseUrl = 'http://localhost:3000/api/v1';

AppConfig buildAppConfig({
  required String apiModeValue,
  required String apiBaseUrlValue,
}) {
  final normalizedMode = apiModeValue.trim().toLowerCase();

  return AppConfig(
    apiMode: normalizedMode == 'remote' ? AppApiMode.remote : AppApiMode.demo,
    apiBaseUrl: apiBaseUrlValue.trim().isEmpty
        ? defaultApiBaseUrl
        : apiBaseUrlValue.trim(),
  );
}

const String _apiModeValue = String.fromEnvironment(
  'PAIRFUND_API_MODE',
  defaultValue: 'demo',
);

const String _apiBaseUrlValue = String.fromEnvironment(
  'PAIRFUND_API_BASE_URL',
  defaultValue: defaultApiBaseUrl,
);

final AppConfig appConfig = buildAppConfig(
  apiModeValue: _apiModeValue,
  apiBaseUrlValue: _apiBaseUrlValue,
);
