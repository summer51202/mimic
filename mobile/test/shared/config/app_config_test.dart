import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/shared/config/app_config.dart';

void main() {
  test('defaults to demo mode when api mode is unknown', () {
    final config = buildAppConfig(
      apiModeValue: 'something-else',
      apiBaseUrlValue: '',
    );

    expect(config.apiMode, AppApiMode.demo);
    expect(config.apiBaseUrl, 'http://localhost:3000/api/v1');
  });

  test('uses remote mode when explicitly configured', () {
    final config = buildAppConfig(
      apiModeValue: 'remote',
      apiBaseUrlValue: 'http://192.168.0.10:3000/api/v1',
    );

    expect(config.apiMode, AppApiMode.remote);
    expect(config.apiBaseUrl, 'http://192.168.0.10:3000/api/v1');
  });
}
