import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';

class CreatedInvite {
  const CreatedInvite({
    required this.id,
    required this.code,
    required this.expiresAt,
    this.invitedEmail,
  });

  final String id;
  final String code;
  final DateTime expiresAt;
  final String? invitedEmail;
}

class AcceptedInvite {
  const AcceptedInvite({
    required this.groupId,
    required this.groupName,
    required this.role,
    required this.joinedAt,
  });

  final String groupId;
  final String groupName;
  final String role;
  final DateTime joinedAt;
}

abstract class InviteRepository {
  Future<CreatedInvite> createInvite(
    String groupId, {
    String? invitedEmail,
  });

  Future<AcceptedInvite> acceptInvite(String code);
}

class DemoInviteRepository implements InviteRepository {
  @override
  Future<CreatedInvite> createInvite(
    String groupId, {
    String? invitedEmail,
  }) async {
    return CreatedInvite(
      id: 'invite-demo',
      code: 'DEMO-INVITE1',
      expiresAt: DateTime.now().add(const Duration(days: 7)),
      invitedEmail: _normalizeOptional(invitedEmail),
    );
  }

  @override
  Future<AcceptedInvite> acceptInvite(String code) async {
    return AcceptedInvite(
      groupId: 'group-demo',
      groupName: 'Demo Group',
      role: 'member',
      joinedAt: DateTime.now(),
    );
  }
}

class RemoteInviteRepository implements InviteRepository {
  RemoteInviteRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<CreatedInvite> createInvite(
    String groupId, {
    String? invitedEmail,
  }) async {
    final normalizedEmail = _normalizeOptional(invitedEmail);
    final response = await _apiClient.post(
      '/groups/$groupId/invites',
      data: <String, dynamic>{
        if (normalizedEmail != null) 'invited_email': normalizedEmail,
      },
    );
    final data = readDataEnvelope(response);

    return CreatedInvite(
      id: _requiredString(data, 'id'),
      code: _requiredString(data, 'code'),
      expiresAt: DateTime.parse(_requiredString(data, 'expires_at')),
      invitedEmail: _normalizeOptional(data['invited_email'] as String?),
    );
  }

  @override
  Future<AcceptedInvite> acceptInvite(String code) async {
    final response = await _apiClient.post(
      '/group-invites/accept',
      data: <String, dynamic>{'invite_code': code.trim()},
    );
    final data = readDataEnvelope(response);

    return AcceptedInvite(
      groupId: _requiredString(data, 'group_id'),
      groupName: _requiredString(data, 'group_name'),
      role: _requiredString(data, 'role'),
      joinedAt: DateTime.parse(_requiredString(data, 'joined_at')),
    );
  }
}

final inviteRepositoryProvider = Provider<InviteRepository>((Ref ref) {
  if (ref.watch(apiModeProvider) == AppApiMode.remote) {
    return RemoteInviteRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoInviteRepository();
});

String? _normalizeOptional(String? value) {
  final normalized = value?.trim();
  return normalized == null || normalized.isEmpty ? null : normalized;
}

String _requiredString(Map<String, dynamic> data, String key) {
  final value = data[key];
  if (value is String && value.isNotEmpty) {
    return value;
  }

  throw FormatException('Missing or invalid required field: $key');
}
