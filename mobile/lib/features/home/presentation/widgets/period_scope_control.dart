import 'package:flutter/material.dart';

import '../../data/group_dashboard.dart';

class PeriodScopeControl extends StatelessWidget {
  const PeriodScopeControl({
    super.key,
    required this.scope,
    required this.onChanged,
  });

  final DashboardScope scope;
  final ValueChanged<DashboardScope> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<DashboardScope>(
      segments: const <ButtonSegment<DashboardScope>>[
        ButtonSegment<DashboardScope>(
          value: DashboardScope.current,
          label: Text('Current', key: Key('dashboard-scope-current')),
        ),
        ButtonSegment<DashboardScope>(
          value: DashboardScope.allTime,
          label: Text('All time', key: Key('dashboard-scope-all-time')),
        ),
      ],
      selected: <DashboardScope>{scope},
      onSelectionChanged: (selection) => onChanged(selection.single),
      showSelectedIcon: false,
      multiSelectionEnabled: false,
    );
  }
}
