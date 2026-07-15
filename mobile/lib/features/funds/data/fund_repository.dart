import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../../shared/utils/currency_formatter.dart';
import 'remote/fund_remote_mapper.dart';

class MemberPositionSummary {
  const MemberPositionSummary({
    required this.name,
    required this.positionLabel,
  });

  final String name;
  final String positionLabel;
}

class FundActivityItem {
  const FundActivityItem({
    required this.title,
    required this.subtitle,
  });

  final String title;
  final String subtitle;
}

class FundDetailSummary {
  const FundDetailSummary({
    required this.fundId,
    required this.fundName,
    required this.balanceLabel,
    required this.monthExpenseLabel,
    required this.monthContributionLabel,
    required this.memberPositions,
    required this.recentActivity,
    required this.lockedPeriodLabel,
  });

  final String fundId;
  final String fundName;
  final String balanceLabel;
  final String monthExpenseLabel;
  final String monthContributionLabel;
  final List<MemberPositionSummary> memberPositions;
  final List<FundActivityItem> recentActivity;
  final String lockedPeriodLabel;
}

abstract class FundRepository {
  Future<FundDetailSummary> fetchFundDetail(String fundId);
}

class DemoFundRepository implements FundRepository {
  @override
  Future<FundDetailSummary> fetchFundDetail(String fundId) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const FundDetailSummary(
      fundId: 'fund-date',
      fundName: 'Date Fund',
      balanceLabel: 'TWD 6,400',
      monthExpenseLabel: 'TWD 1,280',
      monthContributionLabel: 'TWD 2,000',
      memberPositions: <MemberPositionSummary>[
        MemberPositionSummary(
          name: 'Edward',
          positionLabel: '+ TWD 800',
        ),
        MemberPositionSummary(
          name: 'Partner',
          positionLabel: '- TWD 800',
        ),
      ],
      recentActivity: <FundActivityItem>[
        FundActivityItem(
          title: 'Dinner expense added',
          subtitle: 'Yesterday - Split equally',
        ),
        FundActivityItem(
          title: 'Correction recorded',
          subtitle: '2 days ago - Locked period respected',
        ),
      ],
      lockedPeriodLabel: 'Locked through 2026-03-31',
    );
  }
}

class RemoteFundRepository implements FundRepository {
  RemoteFundRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<FundDetailSummary> fetchFundDetail(String fundId) async {
    final detailResponse = await _apiClient.get('/funds/$fundId');
    final expenseResponse = await _apiClient.get(
      '/funds/$fundId/expenses',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 3,
      },
    );
    final contributionResponse = await _apiClient.get(
      '/funds/$fundId/contributions',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 3,
      },
    );

    final detailDto = FundDetailDto.fromJson(
      readDataEnvelope(detailResponse),
      fallbackFundId: fundId,
    );

    final expenseDtos = readDataListEnvelope(expenseResponse)
        .map(FundActivityDto.fromExpenseJson)
        .toList();
    final contributionDtos = readDataListEnvelope(contributionResponse)
        .map(FundActivityDto.fromContributionJson)
        .toList();

    final memberPositions = detailDto.memberPositions
        .map(
          (dto) => mapMemberPositionSummary(
            dto,
            positionLabel: formatMinorCurrency(dto.positionMinor),
          ),
        )
        .toList();

    final recentActivity = <FundActivityItem>[
      ...expenseDtos.map(
        (dto) => mapFundActivityItem(
          dto,
          subtitle: '${dto.occurredOn} - ${formatMinorCurrency(dto.amountMinor)}',
        ),
      ),
      ...contributionDtos.map(
        (dto) => mapFundActivityItem(
          dto,
          subtitle: '${dto.occurredOn} - ${formatMinorCurrency(dto.amountMinor)}',
        ),
      ),
    ];

    return FundDetailSummary(
      fundId: detailDto.id,
      fundName: detailDto.name,
      balanceLabel: formatMinorCurrency(
        detailDto.balanceMinor,
        currency: detailDto.currency,
      ),
      monthExpenseLabel: formatMinorCurrency(
        detailDto.monthExpenseMinor,
        currency: detailDto.currency,
      ),
      monthContributionLabel: formatMinorCurrency(
        detailDto.monthContributionMinor,
        currency: detailDto.currency,
      ),
      memberPositions: memberPositions,
      recentActivity: recentActivity,
      lockedPeriodLabel: detailDto.lockedPeriodLabel,
    );
  }
}

final fundRepositoryProvider = Provider<FundRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteFundRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoFundRepository();
});

