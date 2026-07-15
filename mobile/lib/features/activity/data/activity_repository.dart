import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../../shared/utils/currency_formatter.dart';
import 'remote/activity_remote_mapper.dart';

abstract class ActivityRepository {
  Future<ActivityTimeline> fetchActivity(String fundId);
}

class DemoActivityRepository implements ActivityRepository {
  @override
  Future<ActivityTimeline> fetchActivity(String fundId) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const ActivityTimeline(
      items: <ActivityTimelineItem>[
        ActivityTimelineItem(
          id: 'expense-demo',
          kind: ActivityKind.expense,
          title: 'Dinner',
          subtitle: 'Expense',
          amountLabel: 'TWD 880',
          occurredOn: '2026-04-10',
        ),
        ActivityTimelineItem(
          id: 'correction-demo',
          kind: ActivityKind.correction,
          title: 'Correction for March split',
          subtitle: 'Correction entry',
          amountLabel: 'TWD 200',
          occurredOn: '2026-04-09',
          statusLabel: 'correction',
        ),
        ActivityTimelineItem(
          id: 'contribution-demo',
          kind: ActivityKind.contribution,
          title: 'Contribution',
          subtitle: 'one time',
          amountLabel: 'TWD 1,000',
          occurredOn: '2026-04-08',
        ),
        ActivityTimelineItem(
          id: 'settlement-demo',
          kind: ActivityKind.settlement,
          title: 'Settlement',
          subtitle: '2026-03-01 to 2026-03-31',
          amountLabel: 'TWD 800',
          occurredOn: '2026-03-31',
          statusLabel: 'completed',
        ),
      ],
    );
  }
}

class RemoteActivityRepository implements ActivityRepository {
  RemoteActivityRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<ActivityTimeline> fetchActivity(String fundId) async {
    final expenseResponse = await _apiClient.get(
      '/funds/$fundId/expenses',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 20,
      },
    );
    final contributionResponse = await _apiClient.get(
      '/funds/$fundId/contributions',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 20,
      },
    );
    final settlementResponse = await _apiClient.get(
      '/funds/$fundId/settlements',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 20,
      },
    );

    final expenseItems = readDataListEnvelope(expenseResponse)
        .map(ActivityExpenseDto.fromJson)
        .map(
          (dto) => mapExpenseActivityItem(
            dto,
            amountLabel: formatMinorCurrency(dto.amountMinor),
          ),
        );

    final contributionItems = readDataListEnvelope(contributionResponse)
        .map(ActivityContributionDto.fromJson)
        .map(
          (dto) => mapContributionActivityItem(
            dto,
            amountLabel: formatMinorCurrency(dto.amountMinor),
          ),
        );

    final settlementItems = readDataListEnvelope(settlementResponse)
        .map(ActivitySettlementDto.fromJson)
        .map(
          (dto) => mapSettlementActivityItem(
            dto,
            amountLabel: formatMinorCurrency(dto.amountMinor),
          ),
        );

    final items = <ActivityTimelineItem>[
      ...expenseItems,
      ...contributionItems,
      ...settlementItems,
    ]..sort(
        (a, b) => b.occurredOn.compareTo(a.occurredOn),
      );

    return ActivityTimeline(items: items);
  }
}

final activityRepositoryProvider = Provider<ActivityRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteActivityRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoActivityRepository();
});
