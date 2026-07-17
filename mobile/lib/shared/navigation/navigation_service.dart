import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/router/app_router.dart';

final navigationServiceProvider = Provider<NavigationService>((Ref ref) {
  return NavigationService(ref.watch(appRouterProvider));
});

class NavigationService {
  const NavigationService(this.router);

  final GoRouter router;

  void goHome() {
    router.go('/home');
  }
}
