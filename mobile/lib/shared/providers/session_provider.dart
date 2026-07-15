import 'package:flutter_riverpod/flutter_riverpod.dart';

class SessionState {
  const SessionState({
    this.accessToken,
    this.refreshToken,
    this.userId,
  });

  final String? accessToken;
  final String? refreshToken;
  final String? userId;

  bool get isAuthenticated => accessToken != null && userId != null;

  SessionState copyWith({
    String? accessToken,
    String? refreshToken,
    String? userId,
    bool clearAccessToken = false,
    bool clearRefreshToken = false,
    bool clearUserId = false,
  }) {
    return SessionState(
      accessToken: clearAccessToken ? null : (accessToken ?? this.accessToken),
      refreshToken:
          clearRefreshToken ? null : (refreshToken ?? this.refreshToken),
      userId: clearUserId ? null : (userId ?? this.userId),
    );
  }
}

class SessionNotifier extends StateNotifier<SessionState> {
  SessionNotifier() : super(const SessionState());

  void setSession({
    required String accessToken,
    required String refreshToken,
    required String userId,
  }) {
    state = SessionState(
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: userId,
    );
  }

  void clear() {
    state = const SessionState();
  }
}

final sessionProvider =
    StateNotifierProvider<SessionNotifier, SessionState>((Ref ref) {
  return SessionNotifier();
});
