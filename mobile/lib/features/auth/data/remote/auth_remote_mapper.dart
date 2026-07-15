import '../auth_repository.dart';

class AuthLoginDto {
  const AuthLoginDto({
    required this.userId,
    required this.accessToken,
    required this.refreshToken,
  });

  final String userId;
  final String accessToken;
  final String refreshToken;

  factory AuthLoginDto.fromJson(Map<String, dynamic> data) {
    final user = data['user'] as Map<String, dynamic>? ?? <String, dynamic>{};

    return AuthLoginDto(
      userId: '${user['id'] ?? ''}',
      accessToken: '${data['access_token'] ?? ''}',
      refreshToken: '${data['refresh_token'] ?? ''}',
    );
  }
}

AuthSessionPayload mapAuthSessionPayload(AuthLoginDto dto) {
  return AuthSessionPayload(
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
    userId: dto.userId,
  );
}
