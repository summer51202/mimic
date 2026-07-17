import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/api/api_json.dart';
import '../../../shared/api/api_mode_provider.dart';
import '../../../shared/api/pairfund_api_client.dart';
import '../../../shared/config/app_config.dart';
import '../../../shared/utils/currency_formatter.dart';
import 'remote/settlement_remote_mapper.dart';

class SettlementTransferSuggestion {
  const SettlementTransferSuggestion({
    required this.fromUser,
    required this.toUser,
    required this.amountLabel,
  });

  final String fromUser;
  final String toUser;
  final String amountLabel;
}

class SettlementHistoryItem {
  const SettlementHistoryItem({
    required this.id,
    required this.title,
    required this.subtitle,
  });

  final String id;
  final String title;
  final String subtitle;
}

class SettlementSummary {
  const SettlementSummary({
    this.currentSettlementId,
    required this.periodLabel,
    required this.lockMessage,
    required this.suggestions,
    required this.history,
  });

  final String? currentSettlementId;
  final String periodLabel;
  final String lockMessage;
  final List<SettlementTransferSuggestion> suggestions;
  final List<SettlementHistoryItem> history;
}

abstract class SettlementRepository {
  Future<SettlementSummary> fetchSettlementSummary(String fundId);

  Future<void> completeSettlement(String settlementId);

  Future<void> cancelSettlement(String settlementId);
}

class DemoSettlementRepository implements SettlementRepository {
  @override
  Future<SettlementSummary> fetchSettlementSummary(String fundId) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));

    return const SettlementSummary(
      currentSettlementId: 'settlement-demo',
      periodLabel: 'Coverage: 2026-03-01 to 2026-03-31',
      lockMessage: 'This period becomes locked after completion',
      suggestions: <SettlementTransferSuggestion>[
        SettlementTransferSuggestion(
          fromUser: 'Partner',
          toUser: 'Edward',
          amountLabel: 'TWD 800',
        ),
      ],
      history: <SettlementHistoryItem>[
        SettlementHistoryItem(
          id: 'settlement-demo',
          title: 'February settlement completed',
          subtitle: 'Completed on 2026-03-03',
        ),
      ],
    );
  }

  @override
  Future<void> completeSettlement(String settlementId) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }

  @override
  Future<void> cancelSettlement(String settlementId) async {
    await Future<void>.delayed(const Duration(milliseconds: 250));
  }
}

class RemoteSettlementRepository implements SettlementRepository {
  RemoteSettlementRepository(this._apiClient);

  final PairFundApiClient _apiClient;

  @override
  Future<SettlementSummary> fetchSettlementSummary(String fundId) async {
    final suggestionResponse =
        await _apiClient.get('/funds/$fundId/settlement-suggestion');
    final settlementsResponse = await _apiClient.get(
      '/funds/$fundId/settlements',
      queryParameters: <String, dynamic>{
        'page': 1,
        'page_size': 5,
      },
    );

    final suggestionDto = SettlementSuggestionEnvelopeDto.fromJson(
      readDataEnvelope(suggestionResponse),
    );
    final historyDtos = readDataListEnvelope(settlementsResponse)
        .map(SettlementHistoryDto.fromJson)
        .toList();
    String? pendingSettlementId;
    for (final dto in historyDtos) {
      if (dto.status.toLowerCase() == 'pending' && dto.id.isNotEmpty) {
        pendingSettlementId = dto.id;
        break;
      }
    }

    return SettlementSummary(
      currentSettlementId: pendingSettlementId,
      periodLabel:
          'Coverage: ${suggestionDto.periodStart} to ${suggestionDto.periodEnd}',
      lockMessage: 'This period becomes locked after completion',
      suggestions: suggestionDto.suggestions
          .map(
            (dto) => mapSettlementTransferSuggestion(
              dto,
              amountLabel: formatMinorCurrency(
                dto.amountMinor,
                currency: suggestionDto.currency,
              ),
            ),
          )
          .toList(),
      history: historyDtos
          .map(
            (dto) => mapSettlementHistoryItem(
              dto,
              title: '${dto.status} - ${formatMinorCurrency(dto.amountMinor)}',
            ),
          )
          .toList(),
    );
  }

  @override
  Future<void> completeSettlement(String settlementId) async {
    await _apiClient.post(
      '/settlements/$settlementId/complete',
      data: <String, dynamic>{
        'completed_at': DateTime.now().toUtc().toIso8601String(),
      },
    );
  }

  @override
  Future<void> cancelSettlement(String settlementId) async {
    await _apiClient.post(
      '/settlements/$settlementId/cancel',
      data: <String, dynamic>{},
    );
  }
}

final settlementRepositoryProvider = Provider<SettlementRepository>((Ref ref) {
  final apiMode = ref.watch(apiModeProvider);

  if (apiMode == AppApiMode.remote) {
    return RemoteSettlementRepository(ref.watch(pairFundApiClientProvider));
  }

  return DemoSettlementRepository();
});
