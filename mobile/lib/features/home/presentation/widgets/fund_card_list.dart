import 'package:flutter/material.dart';

import '../../../../shared/constants/design_tokens.dart';
import '../../data/home_repository.dart';

class FundCardList extends StatelessWidget {
  const FundCardList({
    super.key,
    required this.funds,
    required this.onFundTap,
  });

  final List<FundSummary> funds;
  final ValueChanged<FundSummary> onFundTap;

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;

    return Column(
      children: funds
          .map(
            (FundSummary fund) => Padding(
              padding: const EdgeInsets.only(bottom: PfSpacing.sm),
              child: Card(
                child: ListTile(
                  onTap: () => onFundTap(fund),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: PfSpacing.md,
                    vertical: 6,
                  ),
                  title: Text(fund.name, style: textTheme.titleMedium),
                  subtitle: Text(fund.balanceLabel, style: textTheme.bodyMedium),
                  trailing: const Icon(Icons.chevron_right),
                ),
              ),
            ),
          )
          .toList(),
    );
  }
}
