import 'package:flutter/material.dart';

import '../../../../shared/constants/design_tokens.dart';

class BalanceHeroCard extends StatelessWidget {
  const BalanceHeroCard({
    super.key,
    required this.displayName,
    required this.totalBalanceLabel,
  });

  final String displayName;
  final String totalBalanceLabel;

  @override
  Widget build(BuildContext context) {
    final TextTheme textTheme = Theme.of(context).textTheme;

    return Card(
      color: PfColors.accentSoft,
      child: Padding(
        padding: const EdgeInsets.all(PfSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Text('Hello, $displayName', style: textTheme.titleMedium),
            const SizedBox(height: PfSpacing.sm),
            Text('Our shared funds', style: textTheme.headlineMedium),
            const SizedBox(height: PfSpacing.sm),
            Text(totalBalanceLabel, style: textTheme.titleLarge),
          ],
        ),
      ),
    );
  }
}
