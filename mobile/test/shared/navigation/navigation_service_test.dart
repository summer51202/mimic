import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:pairfund_mobile/app/router/app_router.dart';
import 'package:pairfund_mobile/shared/navigation/navigation_service.dart';

void main() {
  test('navigation service uses the router supplied by the app provider', () {
    final router = GoRouter(routes: <RouteBase>[]);
    final container = ProviderContainer(
      overrides: <Override>[
        appRouterProvider.overrideWithValue(router),
      ],
    );
    addTearDown(container.dispose);
    addTearDown(router.dispose);

    expect(container.read(navigationServiceProvider).router, same(router));
  });
}
