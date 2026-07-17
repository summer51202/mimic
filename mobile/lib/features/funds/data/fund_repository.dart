import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../home/data/group_dashboard.dart';
import 'remote/fund_remote_mapper.dart';

enum FundActivityType { expense, contribution }

class FundActivityItem {
  const FundActivityItem(
      {required this.type,
      required this.title,
      required this.occurredOn,
      required this.amountMinor});
  final FundActivityType type;
  final String title;
  final DateTime occurredOn;
  final int amountMinor;
}

class FundDetailSummary {
  FundDetailSummary({
    required this.fundId,
    required this.fundName,
    required this.currency,
    required this.cashBalanceMinor,
    required this.periodStart,
    required this.periodEnd,
    required this.lastCompletedSettlementId,
    required this.lastCompletedPeriodEnd,
    required this.current,
    required this.allTime,
    required List<FundActivityItem> recentActivity,
  }) : recentActivity = List.unmodifiable(recentActivity);

  final String fundId;
  final String fundName;
  final String currency;
  final int cashBalanceMinor;
  final DateTime? periodStart;
  final DateTime? periodEnd;
  final String? lastCompletedSettlementId;
  final DateTime? lastCompletedPeriodEnd;
  final DashboardPeriodTotals current;
  final DashboardPeriodTotals allTime;
  final List<FundActivityItem> recentActivity;
}

abstract class FundRepository {
  Future<FundDetailSummary> fetchFundDetail(String fundId);
}

class DemoFundRepository implements FundRepository {
  @override
  Future<FundDetailSummary> fetchFundDetail(String fundId) async =>
      FundDetailSummary(
        fundId: fundId,
        fundName: 'Date Fund',
        currency: 'TWD',
        cashBalanceMinor: 6400,
        periodStart: DateTime.utc(2026, 4),
        periodEnd: DateTime.now().toUtc(),
        lastCompletedSettlementId: 'demo-settlement',
        lastCompletedPeriodEnd: DateTime.utc(2026, 3, 31),
        current: DashboardPeriodTotals(
          netChangeMinor: 720,
          contributionMinor: 2000,
          expenseMinor: 1280,
          memberPositions: const <DashboardMemberPosition>[
            DashboardMemberPosition(
                userId: 'edward',
                displayName: 'Edward',
                membershipStatus: 'active',
                positionMinor: 800),
            DashboardMemberPosition(
                userId: 'partner',
                displayName: 'Partner',
                membershipStatus: 'active',
                positionMinor: -800),
          ],
        ),
        allTime: DashboardPeriodTotals(
            netChangeMinor: 6400,
            contributionMinor: 10000,
            expenseMinor: 3600,
            memberPositions: const <DashboardMemberPosition>[]),
        recentActivity: const <FundActivityItem>[],
      );
}

class RemoteFundRepository implements FundRepository {
  RemoteFundRepository(this._apiClient);
  final PairFundApiClient _apiClient;

  @override
  Future<FundDetailSummary> fetchFundDetail(String fundId) async {
    final summaryResponse = await _apiClient.get('/funds/$fundId/summary');
    final expenseResponse = await _apiClient.get('/funds/$fundId/expenses',
        queryParameters: <String, dynamic>{
          'page': 1,
          'page_size': 3,
          'sort': 'occurred_on_desc'
        });
    final contributionResponse = await _apiClient
        .get('/funds/$fundId/contributions', queryParameters: <String, dynamic>{
      'page': 1,
      'page_size': 3,
      'sort': 'occurred_on_desc'
    });
    final summary = mapFundSummaryResponse(summaryResponse);
    final activities = <FundActivityItem>[
      ...readDataListEnvelope(expenseResponse)
          .map((json) => mapFundActivity(json, contribution: false)),
      ...readDataListEnvelope(contributionResponse)
          .map((json) => mapFundActivity(json, contribution: true)),
    ]..sort((a, b) {
        final byDate = b.occurredOn.compareTo(a.occurredOn);
        if (byDate != 0) return byDate;
        final byType = a.type.index.compareTo(b.type.index);
        if (byType != 0) return byType;
        final byTitle = a.title.compareTo(b.title);
        if (byTitle != 0) return byTitle;
        return b.amountMinor.compareTo(a.amountMinor);
      });
    return summary.withRecentActivity(activities.take(3).toList());
  }
}

final fundRepositoryProvider = Provider<FundRepository>((Ref ref) {
  return ref.watch(apiModeProvider) == AppApiMode.remote
      ? RemoteFundRepository(ref.watch(pairFundApiClientProvider))
      : DemoFundRepository();
});
