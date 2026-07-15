import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';
import 'theme/app_theme.dart';
import '../shared/providers/session_bootstrap_provider.dart';

class PairFundApp extends ConsumerWidget {
  const PairFundApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final sessionBootstrap = ref.watch(sessionBootstrapProvider);
    final router = ref.watch(appRouterProvider);

    if (sessionBootstrap.isLoading) {
      return MaterialApp(
        title: 'PairFund',
        debugShowCheckedModeBanner: false,
        theme: buildAppTheme(),
        home: const Scaffold(
          body: Center(
            child: CircularProgressIndicator(),
          ),
        ),
      );
    }

    return MaterialApp.router(
      title: 'PairFund',
      debugShowCheckedModeBanner: false,
      theme: buildAppTheme(),
      routerConfig: router,
    );
  }
}
