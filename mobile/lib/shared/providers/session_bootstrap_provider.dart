import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../storage/session_persistence.dart';
import 'session_provider.dart';

final sessionBootstrapProvider = FutureProvider<void>((Ref ref) async {
  final persistedSession =
      await ref.read(sessionPersistenceProvider).readSession();

  if (persistedSession == null) {
    return;
  }

  ref.read(sessionProvider.notifier).setSession(
        accessToken: persistedSession.accessToken!,
        refreshToken: persistedSession.refreshToken ?? '',
        userId: persistedSession.userId!,
      );
});
