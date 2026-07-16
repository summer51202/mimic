import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../../shared/utils/currency_formatter.dart';
import 'remote/home_remote_mapper.dart';

class FundSummary {
  const FundSummary({
    required this.id,
    required this.name,
    required this.balanceLabel,
  });

  final String id;
  final String name;
  final String balanceLabel;
}

class ActivityPreview {
  const ActivityPreview({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;
}

class HomeSummary {
  const HomeSummary({
    this.groupId,
    required this.displayName,
    required this.totalBalanceLabel,
    required this.activeFunds,
    required this.recentActivities,
    required this.pendingTasksCount,
  });

  final String? groupId;
  final String displayName;
  final String totalBalanceLabel;
  final List<FundSummary> activeFunds;
  final List<ActivityPreview> recentActivities;
  final int pendingTasksCount;
}

abstract class HomeRepository {
  Future<HomeSummary> fetchSummary();
}

class DemoHomeRepository implements HomeRepository {
  @override
  Future<HomeSummary> fetchSummary() async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const HomeSummary(
      groupId: 'group-demo',
      displayName: 'Edward',
      totalBalanceLabel: 'TWD 12,800',
      activeFunds: <FundSummary>[
        FundSummary(
          id: 'fund-date',
          name: 'Date Fund',
          balanceLabel: 'TWD 6,400',
        ),
        FundSummary(
          id: 'fund-trip',
          name: 'Trip Fund',
          balanceLabel: 'TWD 6,400',
        ),
      ],
      recentActivities: <ActivityPreview>[
        ActivityPreview(
          title: 'Dinner expense added',
          subtitle: 'Date Fund - 2 hours ago',
        ),
        ActivityPreview(
          title: 'April contribution recorded',
          subtitle: 'Trip Fund - Yesterday',
        ),
      ],
      pendingTasksCount: 2,
    );
  }
}

class RemoteHomeRepository implements HomeRepository {
  RemoteHomeRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<HomeSummary> fetchSummary() async {
    final meResponse = await _apiClient.get('/me');
    final groupsResponse = await _apiClient.get('/groups');

    final userJson = readDataEnvelope(meResponse);
    final groupsJson = readDataListEnvelope(groupsResponse);
    final userDto = MeDto.fromJson(userJson);
    final groups = groupsJson.map(GroupDto.fromJson).toList();

    if (groups.isEmpty) {
      return mapRemoteHomeSummary(
        groupId: null,
        user: userDto,
        totalBalanceLabel: formatMinorCurrency(0),
        activeFunds: const <FundSummary>[],
      );
    }

    final fundsResponse =
        await _apiClient.get('/groups/${groups.first.id}/funds');
    final fundDtos = readDataListEnvelope(fundsResponse)
        .map(FundListItemDto.fromJson)
        .toList();

    final activeFunds = fundDtos
        .map(
          (dto) => mapFundSummary(
            dto,
            balanceLabel: formatMinorCurrency(
              dto.balanceMinor,
              currency: dto.currency,
            ),
          ),
        )
        .toList();

    final totalBalanceMinor = fundDtos.fold<int>(
      0,
      (sum, dto) => sum + dto.balanceMinor,
    );

    return mapRemoteHomeSummary(
      groupId: groups.first.id,
      user: userDto,
      totalBalanceLabel: formatMinorCurrency(totalBalanceMinor),
      activeFunds: activeFunds,
    );
  }
}

final homeRepositoryProvider = Provider<HomeRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteHomeRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoHomeRepository();
});
