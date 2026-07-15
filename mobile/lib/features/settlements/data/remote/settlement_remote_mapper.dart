import '../settlement_repository.dart';

class SettlementSuggestionDto {
  const SettlementSuggestionDto({
    required this.fromUserId,
    required this.toUserId,
    required this.amountMinor,
  });

  final String fromUserId;
  final String toUserId;
  final int amountMinor;

  factory SettlementSuggestionDto.fromJson(Map<String, dynamic> data) {
    return SettlementSuggestionDto(
      fromUserId: '${data['from_user_id'] ?? 'From'}',
      toUserId: '${data['to_user_id'] ?? 'To'}',
      amountMinor: (data['amount_minor'] as num?)?.toInt() ?? 0,
    );
  }
}

class SettlementHistoryDto {
  const SettlementHistoryDto({
    required this.id,
    required this.status,
    required this.amountMinor,
    required this.periodStart,
    required this.periodEnd,
  });

  final String id;
  final String status;
  final int amountMinor;
  final String periodStart;
  final String periodEnd;

  factory SettlementHistoryDto.fromJson(Map<String, dynamic> data) {
    return SettlementHistoryDto(
      id: '${data['id'] ?? ''}',
      status: '${data['status'] ?? 'Settlement'}',
      amountMinor: (data['amount_minor'] as num?)?.toInt() ?? 0,
      periodStart: '${data['period_start'] ?? '-'}',
      periodEnd: '${data['period_end'] ?? '-'}',
    );
  }
}

class SettlementSuggestionEnvelopeDto {
  const SettlementSuggestionEnvelopeDto({
    required this.currency,
    required this.periodStart,
    required this.periodEnd,
    required this.suggestions,
  });

  final String currency;
  final String periodStart;
  final String periodEnd;
  final List<SettlementSuggestionDto> suggestions;

  factory SettlementSuggestionEnvelopeDto.fromJson(Map<String, dynamic> data) {
    final suggestionsJson =
        (data['suggestions'] as List?)?.whereType<Map<String, dynamic>>().toList() ??
            <Map<String, dynamic>>[];

    return SettlementSuggestionEnvelopeDto(
      currency: '${data['currency'] ?? 'TWD'}',
      periodStart: '${data['period_start'] ?? '-'}',
      periodEnd: '${data['period_end'] ?? '-'}',
      suggestions: suggestionsJson.map(SettlementSuggestionDto.fromJson).toList(),
    );
  }
}

SettlementTransferSuggestion mapSettlementTransferSuggestion(
  SettlementSuggestionDto dto, {
  required String amountLabel,
}) {
  return SettlementTransferSuggestion(
    fromUser: dto.fromUserId,
    toUser: dto.toUserId,
    amountLabel: amountLabel,
  );
}

SettlementHistoryItem mapSettlementHistoryItem(
  SettlementHistoryDto dto, {
  required String title,
}) {
  return SettlementHistoryItem(
    id: dto.id,
    title: title,
    subtitle: '${dto.periodStart} to ${dto.periodEnd}',
  );
}
