import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/features/home/data/home_repository.dart';
import 'package:pairfund_mobile/features/home/providers/home_summary_provider.dart';
import 'package:pairfund_mobile/features/groups/data/group_summary.dart';
import 'package:pairfund_mobile/features/groups/data/selected_group_persistence.dart';
import 'package:pairfund_mobile/features/invites/data/invite_repository.dart';
import 'package:pairfund_mobile/features/invites/providers/accept_invite_controller.dart';
import 'package:pairfund_mobile/features/invites/providers/create_invite_controller.dart';
import 'package:pairfund_mobile/shared/api/api_exception.dart';

final _createdInvite = CreatedInvite(
  id: 'invite-1',
  code: 'PAIR-1234',
  expiresAt: _inviteExpiry,
  invitedEmail: 'partner@example.com',
);

final _acceptedInvite = AcceptedInvite(
  groupId: 'group-1',
  groupName: 'Our Home',
  role: 'member',
  joinedAt: _joinedAt,
);

const _homeSummary = HomeSummary(
  displayName: 'Edward',
  totalBalanceLabel: 'TWD 0',
  activeFunds: <FundSummary>[],
  recentActivities: <ActivityPreview>[],
  pendingTasksCount: 0,
);

final _inviteExpiry = DateTime.utc(2026, 7, 23);
final _joinedAt = DateTime.utc(2026, 7, 16);

class FakeInviteRepository implements InviteRepository {
  Future<CreatedInvite> Function(String groupId, String? invitedEmail)?
      onCreate;
  Future<AcceptedInvite> Function(String code)? onAccept;

  int createCalls = 0;
  int acceptCalls = 0;
  String? lastGroupId;
  String? lastInvitedEmail;
  String? lastCode;

  @override
  Future<CreatedInvite> createInvite(
    String groupId, {
    String? invitedEmail,
  }) {
    createCalls += 1;
    lastGroupId = groupId;
    lastInvitedEmail = invitedEmail;
    return onCreate?.call(groupId, invitedEmail) ??
        Future<CreatedInvite>.value(_createdInvite);
  }

  @override
  Future<AcceptedInvite> acceptInvite(String code) {
    acceptCalls += 1;
    lastCode = code;
    return onAccept?.call(code) ??
        Future<AcceptedInvite>.value(_acceptedInvite);
  }
}

class CountingHomeRepository implements HomeRepository {
  int fetchCalls = 0;
  int fetchGroupCalls = 0;

  @override
  Future<List<GroupSummary>> fetchGroups() async {
    fetchGroupCalls += 1;
    return const <GroupSummary>[
      GroupSummary(
        id: 'group-1',
        name: 'Our Home',
        groupType: 'couple',
        memberCount: 2,
        role: 'member',
      ),
    ];
  }

  @override
  Future<HomeSummary> fetchSummary({required String? groupId}) async {
    fetchCalls += 1;
    return _homeSummary;
  }
}

class MemorySelectedGroupPersistence implements SelectedGroupPersistence {
  String? value;

  @override
  Future<void> clear() async => value = null;

  @override
  Future<String?> read() async => value;

  @override
  Future<void> write(String groupId) async => value = groupId;
}

ProviderContainer _container(
  FakeInviteRepository repository, {
  HomeRepository? homeRepository,
}) {
  return ProviderContainer(
    overrides: <Override>[
      inviteRepositoryProvider.overrideWithValue(repository),
      if (homeRepository != null)
        homeRepositoryProvider.overrideWithValue(homeRepository),
      selectedGroupPersistenceProvider.overrideWithValue(
        MemorySelectedGroupPersistence(),
      ),
    ],
  );
}

ApiException _apiException(String code) => ApiException(
      code: code,
      message: 'Server message for $code',
    );

void main() {
  group('CreateInviteState', () {
    test('copyWith can clear invite and error', () {
      final state = CreateInviteState(
        emailDraft: 'partner@example.com',
        invite: _createdInvite,
        errorMessage: 'old error',
      );

      final cleared = state.copyWith(clearInvite: true, clearError: true);

      expect(cleared.emailDraft, 'partner@example.com');
      expect(cleared.invite, isNull);
      expect(cleared.errorMessage, isNull);
    });
  });

  group('CreateInviteController', () {
    test('updateEmail stores the draft', () {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);

      container
          .read(createInviteControllerProvider('group-1').notifier)
          .updateEmail(' Partner@Example.com ');

      expect(
        container.read(createInviteControllerProvider('group-1')).emailDraft,
        ' Partner@Example.com ',
      );
    });

    test('valid email is normalized and successful invite is stored', () async {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier =
          container.read(createInviteControllerProvider('group-1').notifier);

      notifier.updateEmail('  Partner@Example.COM  ');
      final result = await notifier.submit();
      final state = container.read(createInviteControllerProvider('group-1'));

      expect(result, isTrue);
      expect(repository.lastGroupId, 'group-1');
      expect(repository.lastInvitedEmail, 'partner@example.com');
      expect(state.invite, same(_createdInvite));
      expect(state.errorMessage, isNull);
      expect(state.isSubmitting, isFalse);
    });

    test('blank email is submitted as null', () async {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier =
          container.read(createInviteControllerProvider('group-1').notifier);

      notifier.updateEmail('   ');
      final result = await notifier.submit();

      expect(result, isTrue);
      expect(repository.createCalls, 1);
      expect(repository.lastInvitedEmail, isNull);
    });

    test('invalid nonblank email is rejected without calling repository',
        () async {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier =
          container.read(createInviteControllerProvider('group-1').notifier);

      notifier.updateEmail('not-an-email');
      final result = await notifier.submit();
      final state = container.read(createInviteControllerProvider('group-1'));

      expect(result, isFalse);
      expect(repository.createCalls, 0);
      expect(state.errorMessage, 'Please enter a valid email address.');
      expect(state.isSubmitting, isFalse);
    });

    test('maps GROUP_OWNER_REQUIRED to the stable owner message', () async {
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) async => throw _apiException(
              'GROUP_OWNER_REQUIRED',
            );
      final container = _container(repository);
      addTearDown(container.dispose);

      final result = await container
          .read(createInviteControllerProvider('group-1').notifier)
          .submit();

      expect(result, isFalse);
      expect(
        container.read(createInviteControllerProvider('group-1')).errorMessage,
        'Only a group owner can invite members.',
      );
    });

    test('unknown ApiException uses the generic create error', () async {
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) async => throw _apiException('UNKNOWN_CODE');
      final container = _container(repository);
      addTearDown(container.dispose);

      await container
          .read(createInviteControllerProvider('group-1').notifier)
          .submit();

      expect(
        container.read(createInviteControllerProvider('group-1')).errorMessage,
        'Unable to create an invite right now.',
      );
    });

    test('general exception uses the generic create error', () async {
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) async => throw StateError('offline');
      final container = _container(repository);
      addTearDown(container.dispose);

      await container
          .read(createInviteControllerProvider('group-1').notifier)
          .submit();

      expect(
        container.read(createInviteControllerProvider('group-1')).errorMessage,
        'Unable to create an invite right now.',
      );
    });

    test('second submit while in flight returns false and does not call twice',
        () async {
      final completer = Completer<CreatedInvite>();
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) => completer.future;
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier =
          container.read(createInviteControllerProvider('group-1').notifier);

      final first = notifier.submit();
      final second = await notifier.submit();

      expect(second, isFalse);
      expect(repository.createCalls, 1);
      expect(
        container.read(createInviteControllerProvider('group-1')).isSubmitting,
        isTrue,
      );

      completer.complete(_createdInvite);
      expect(await first, isTrue);
    });

    test('pending success completes safely after provider is auto-disposed',
        () async {
      final completer = Completer<CreatedInvite>();
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) => completer.future;
      final container = _container(repository);
      addTearDown(container.dispose);
      final provider = createInviteControllerProvider('group-1');
      final subscription = container.listen<CreateInviteState>(
        provider,
        (_, __) {},
        fireImmediately: true,
      );
      final submitFuture = container.read(provider.notifier).submit();

      subscription.close();
      await container.pump();
      completer.complete(_createdInvite);

      await expectLater(submitFuture, completion(isTrue));
    });

    test('pending failure completes safely after provider is auto-disposed',
        () async {
      final completer = Completer<CreatedInvite>();
      final repository = FakeInviteRepository()
        ..onCreate = (_, __) => completer.future;
      final container = _container(repository);
      addTearDown(container.dispose);
      final provider = createInviteControllerProvider('group-1');
      final subscription = container.listen<CreateInviteState>(
        provider,
        (_, __) {},
        fireImmediately: true,
      );
      final submitFuture = container.read(provider.notifier).submit();

      subscription.close();
      await container.pump();
      completer.completeError(StateError('offline'));

      await expectLater(submitFuture, completion(isFalse));
    });
  });

  group('AcceptInviteState', () {
    test('copyWith can clear accepted invite and error', () {
      final state = AcceptInviteState(
        codeDraft: 'PAIR-1234',
        acceptedInvite: _acceptedInvite,
        errorMessage: 'old error',
      );

      final cleared =
          state.copyWith(clearAcceptedInvite: true, clearError: true);

      expect(cleared.codeDraft, 'PAIR-1234');
      expect(cleared.acceptedInvite, isNull);
      expect(cleared.errorMessage, isNull);
    });
  });

  group('AcceptInviteController', () {
    test('updateCode stores the draft', () {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);

      container
          .read(acceptInviteControllerProvider.notifier)
          .updateCode(' PAIR-1234 ');

      expect(
        container.read(acceptInviteControllerProvider).codeDraft,
        ' PAIR-1234 ',
      );
    });

    test('blank code is rejected without calling repository', () async {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier = container.read(acceptInviteControllerProvider.notifier);

      notifier.updateCode('   ');
      final result = await notifier.submit();
      final state = container.read(acceptInviteControllerProvider);

      expect(result, isFalse);
      expect(repository.acceptCalls, 0);
      expect(state.errorMessage, 'Please enter an invite code.');
      expect(state.isSubmitting, isFalse);
    });

    test('trimmed valid code is submitted and accepted invite is stored',
        () async {
      final repository = FakeInviteRepository();
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier = container.read(acceptInviteControllerProvider.notifier);

      notifier.updateCode('  PAIR-1234  ');
      final result = await notifier.submit();
      final state = container.read(acceptInviteControllerProvider);

      expect(result, isTrue);
      expect(repository.lastCode, 'PAIR-1234');
      expect(state.acceptedInvite, same(_acceptedInvite));
      expect(state.errorMessage, isNull);
      expect(state.isSubmitting, isFalse);
    });

    test('successful acceptance invalidates and refetches home summary',
        () async {
      final repository = FakeInviteRepository();
      final homeRepository = CountingHomeRepository();
      final container = _container(
        repository,
        homeRepository: homeRepository,
      );
      addTearDown(container.dispose);
      final subscription = container.listen<AsyncValue<HomeSummary>>(
        homeSummaryProvider,
        (_, __) {},
        fireImmediately: true,
      );
      addTearDown(subscription.close);
      await container.read(homeSummaryProvider.future);
      expect(homeRepository.fetchCalls, 1);

      container
          .read(acceptInviteControllerProvider.notifier)
          .updateCode('PAIR-1234');
      final result = await container
          .read(acceptInviteControllerProvider.notifier)
          .submit();
      await container.read(homeSummaryProvider.future);

      expect(result, isTrue);
      expect(homeRepository.fetchCalls, 2);
    });

    for (final entry in <String, String>{
      'INVITE_NOT_FOUND': 'This invite code was not found.',
      'INVITE_ALREADY_USED': 'This invite code has already been used.',
      'INVITE_EXPIRED': 'This invite code has expired.',
      'INVITE_EMAIL_MISMATCH':
          'This invite was created for another email address.',
      'ALREADY_GROUP_MEMBER': 'You are already a member of this group.',
    }.entries) {
      test('maps ${entry.key} to its stable message', () async {
        final repository = FakeInviteRepository()
          ..onAccept = (_) async => throw _apiException(entry.key);
        final container = _container(repository);
        addTearDown(container.dispose);
        final notifier =
            container.read(acceptInviteControllerProvider.notifier);
        notifier.updateCode('PAIR-1234');

        final result = await notifier.submit();
        final state = container.read(acceptInviteControllerProvider);

        expect(result, isFalse);
        expect(state.errorMessage, entry.value);
        expect(state.isSubmitting, isFalse);
      });
    }

    test('unknown ApiException uses the generic accept error', () async {
      final repository = FakeInviteRepository()
        ..onAccept = (_) async => throw _apiException('UNKNOWN_CODE');
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier = container.read(acceptInviteControllerProvider.notifier);
      notifier.updateCode('PAIR-1234');

      await notifier.submit();

      expect(
        container.read(acceptInviteControllerProvider).errorMessage,
        'Unable to accept this invite right now.',
      );
    });

    test('general exception uses the generic accept error', () async {
      final repository = FakeInviteRepository()
        ..onAccept = (_) async => throw StateError('offline');
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier = container.read(acceptInviteControllerProvider.notifier);
      notifier.updateCode('PAIR-1234');

      await notifier.submit();

      expect(
        container.read(acceptInviteControllerProvider).errorMessage,
        'Unable to accept this invite right now.',
      );
    });

    test('second submit while in flight returns false and does not call twice',
        () async {
      final completer = Completer<AcceptedInvite>();
      final repository = FakeInviteRepository()
        ..onAccept = (_) => completer.future;
      final container = _container(repository);
      addTearDown(container.dispose);
      final notifier = container.read(acceptInviteControllerProvider.notifier);
      notifier.updateCode('PAIR-1234');

      final first = notifier.submit();
      final second = await notifier.submit();

      expect(second, isFalse);
      expect(repository.acceptCalls, 1);
      expect(
        container.read(acceptInviteControllerProvider).isSubmitting,
        isTrue,
      );

      completer.complete(_acceptedInvite);
      expect(await first, isTrue);
    });

    test(
        'pending success completes safely and invalidates home after auto-dispose',
        () async {
      final completer = Completer<AcceptedInvite>();
      final repository = FakeInviteRepository()
        ..onAccept = (_) => completer.future;
      final homeRepository = CountingHomeRepository();
      final container = _container(
        repository,
        homeRepository: homeRepository,
      );
      addTearDown(container.dispose);
      final homeSubscription = container.listen<AsyncValue<HomeSummary>>(
        homeSummaryProvider,
        (_, __) {},
        fireImmediately: true,
      );
      addTearDown(homeSubscription.close);
      await container.read(homeSummaryProvider.future);
      expect(homeRepository.fetchCalls, 1);
      final subscription = container.listen<AcceptInviteState>(
        acceptInviteControllerProvider,
        (_, __) {},
        fireImmediately: true,
      );
      final notifier = container.read(acceptInviteControllerProvider.notifier);
      notifier.updateCode('PAIR-1234');
      final submitFuture = notifier.submit();

      subscription.close();
      await container.pump();
      completer.complete(_acceptedInvite);

      await expectLater(submitFuture, completion(isTrue));
      await container.read(homeSummaryProvider.future);
      expect(homeRepository.fetchCalls, 2);
    });

    test('pending failure completes safely after provider is auto-disposed',
        () async {
      final completer = Completer<AcceptedInvite>();
      final repository = FakeInviteRepository()
        ..onAccept = (_) => completer.future;
      final container = _container(repository);
      addTearDown(container.dispose);
      final subscription = container.listen<AcceptInviteState>(
        acceptInviteControllerProvider,
        (_, __) {},
        fireImmediately: true,
      );
      final notifier = container.read(acceptInviteControllerProvider.notifier);
      notifier.updateCode('PAIR-1234');
      final submitFuture = notifier.submit();

      subscription.close();
      await container.pump();
      completer.completeError(StateError('offline'));

      await expectLater(submitFuture, completion(isFalse));
    });
  });
}
