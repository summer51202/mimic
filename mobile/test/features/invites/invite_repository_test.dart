import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/invites/data/invite_repository.dart';
import 'package:pairfund_mobile/shared/api/api_mode_provider.dart';
import 'package:pairfund_mobile/shared/api/pairfund_api_client.dart';
import 'package:pairfund_mobile/shared/config/app_config.dart';

class RecordingApiClient implements PairFundApiClient {
  RecordingApiClient(this.responses);

  final Map<String, Map<String, dynamic>> responses;
  String? lastPostPath;
  Map<String, dynamic>? lastPostData;

  @override
  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async =>
      throw UnimplementedError();

  @override
  Future<Map<String, dynamic>> post(
    String path, {
    Map<String, dynamic>? data,
    Map<String, dynamic>? queryParameters,
  }) async {
    lastPostPath = path;
    lastPostData = data;
    return responses[path] ??
        (throw StateError('Missing fake response for POST $path'));
  }
}

void main() {
  group('RemoteInviteRepository', () {
    test('create posts exact path and payload and parses the response',
        () async {
      final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
        '/groups/group-1/invites': <String, dynamic>{
          'data': <String, dynamic>{
            'invite_id': 'invite-1',
            'invite_code': 'PAIR-1234',
            'expires_at': '2026-07-23T10:30:00.000Z',
            'invited_email': 'partner@example.com',
          },
        },
      });

      final result = await RemoteInviteRepository(apiClient).createInvite(
        'group-1',
        invitedEmail: '  partner@example.com  ',
      );

      expect(apiClient.lastPostPath, '/groups/group-1/invites');
      expect(apiClient.lastPostData, <String, dynamic>{
        'invited_email': 'partner@example.com',
      });
      expect(result.id, 'invite-1');
      expect(result.code, 'PAIR-1234');
      expect(result.expiresAt, DateTime.parse('2026-07-23T10:30:00.000Z'));
      expect(result.invitedEmail, 'partner@example.com');
    });

    for (final entry in <String, String?>{
      'null email': null,
      'empty email': '',
      'whitespace-only email': '   ',
    }.entries) {
      test('create omits invited_email for ${entry.key}', () async {
        final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
          '/groups/group-1/invites': <String, dynamic>{
            'data': <String, dynamic>{
              'invite_id': 'invite-1',
              'invite_code': 'PAIR-1234',
              'expires_at': '2026-07-23T10:30:00.000Z',
            },
          },
        });

        await RemoteInviteRepository(apiClient).createInvite(
          'group-1',
          invitedEmail: entry.value,
        );

        expect(apiClient.lastPostData, isEmpty);
        expect(apiClient.lastPostData, isNot(contains('invited_email')));
      });
    }

    test('accept trims code, posts exact payload, and parses the response',
        () async {
      final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
        '/group-invites/accept': <String, dynamic>{
          'data': <String, dynamic>{
            'group_id': 'group-2',
            'group_name': 'Our Home',
            'role': 'member',
            'joined_at': '2026-07-16T09:00:00.000Z',
          },
        },
      });

      final result = await RemoteInviteRepository(apiClient).acceptInvite(
        '  PAIR-5678  ',
      );

      expect(apiClient.lastPostPath, '/group-invites/accept');
      expect(apiClient.lastPostData, <String, dynamic>{
        'invite_code': 'PAIR-5678',
      });
      expect(result.groupId, 'group-2');
      expect(result.groupName, 'Our Home');
      expect(result.role, 'member');
      expect(result.joinedAt, DateTime.parse('2026-07-16T09:00:00.000Z'));
    });

    test('create throws when the response is missing the data envelope', () {
      final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
        '/groups/group-1/invites': <String, dynamic>{},
      });

      expect(
        () => RemoteInviteRepository(apiClient).createInvite('group-1'),
        throwsA(isA<FormatException>()),
      );
    });

    for (final missingField in <String>['invite_id', 'invite_code']) {
      test('create throws FormatException when $missingField is missing', () {
        final data = <String, dynamic>{
          'invite_id': 'invite-1',
          'invite_code': 'PAIR-1234',
          'expires_at': '2026-07-23T10:30:00.000Z',
        }..remove(missingField);
        final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
          '/groups/group-1/invites': <String, dynamic>{'data': data},
        });

        expect(
          () => RemoteInviteRepository(apiClient).createInvite('group-1'),
          throwsA(isA<FormatException>()),
        );
      });
    }

    test('create throws FormatException for non-string invited_email', () {
      final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
        '/groups/group-1/invites': <String, dynamic>{
          'data': <String, dynamic>{
            'invite_id': 'invite-1',
            'invite_code': 'PAIR-1234',
            'expires_at': '2026-07-23T10:30:00.000Z',
            'invited_email': 42,
          },
        },
      });

      expect(
        () => RemoteInviteRepository(apiClient).createInvite('group-1'),
        throwsA(isA<FormatException>()),
      );
    });
  });

  group('DemoInviteRepository', () {
    test('returns deterministic create values and normalized email', () async {
      final now = DateTime.utc(2026, 7, 16, 12, 30);
      final result = await DemoInviteRepository(clock: () => now).createInvite(
        'group-any',
        invitedEmail: '  demo@example.com ',
      );

      expect(result.id, 'invite-demo');
      expect(result.code, 'DEMO-INVITE1');
      expect(result.invitedEmail, 'demo@example.com');
      expect(result.expiresAt, DateTime.utc(2026, 7, 23, 12, 30));
      expect(result.expiresAt.isUtc, isTrue);
    });

    test('returns deterministic accepted group values', () async {
      final now = DateTime.utc(2026, 7, 16, 12, 30);
      final result = await DemoInviteRepository(
        clock: () => now,
      ).acceptInvite('anything');

      expect(result.groupId, 'group-demo');
      expect(result.groupName, 'Demo Group');
      expect(result.role, 'member');
      expect(result.joinedAt, now);
      expect(result.joinedAt.isUtc, isTrue);
    });
  });

  group('inviteRepositoryProvider', () {
    test('selects demo repository in demo mode', () {
      final container = ProviderContainer(overrides: <Override>[
        apiModeProvider.overrideWithValue(AppApiMode.demo),
      ]);
      addTearDown(container.dispose);

      expect(container.read(inviteRepositoryProvider),
          isA<DemoInviteRepository>());
    });

    test('selects remote repository with the overridden API client', () async {
      final apiClient = RecordingApiClient(<String, Map<String, dynamic>>{
        '/group-invites/accept': <String, dynamic>{
          'data': <String, dynamic>{
            'group_id': 'selected-client-group',
            'group_name': 'Selected Client Group',
            'role': 'member',
            'joined_at': '2026-07-16T09:00:00.000Z',
          },
        },
      });
      final container = ProviderContainer(overrides: <Override>[
        apiModeProvider.overrideWithValue(AppApiMode.remote),
        pairFundApiClientProvider.overrideWithValue(apiClient),
      ]);
      addTearDown(container.dispose);

      final repository = container.read(inviteRepositoryProvider);
      final result = await repository.acceptInvite(' CODE ');

      expect(repository, isA<RemoteInviteRepository>());
      expect(result.groupId, 'selected-client-group');
      expect(apiClient.lastPostData, <String, dynamic>{'invite_code': 'CODE'});
    });
  });
}
