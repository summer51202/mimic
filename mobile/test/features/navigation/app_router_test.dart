import 'package:flutter_test/flutter_test.dart';
import 'package:pairfund_mobile/app/router/app_routes.dart';

void main() {
  test('router contains main mobile routes', () {
    const routes = <String>[
      AppRoutes.login,
      AppRoutes.home,
      AppRoutes.fundDetail,
      AppRoutes.fundActivity,
      AppRoutes.createExpense,
      AppRoutes.createCorrection,
      AppRoutes.settlement,
      AppRoutes.confirmations,
      AppRoutes.settings,
    ];

    expect(routes, isNotEmpty);
    expect(routes, contains('/login'));
    expect(routes, contains('/settings'));
    expect(routes, contains('/funds/:fundId/settlement'));
  });

  test('fund-scoped child routes are represented as subpages', () {
    final childRoutes = <String>[
      AppRoutes.fundActivity,
      AppRoutes.createContribution,
      AppRoutes.createExpense,
      AppRoutes.createCorrection,
      AppRoutes.settlement,
    ];

    expect(childRoutes, everyElement(startsWith('/funds/:fundId/')));
    expect(AppRoutes.fundActivityPath('fund-1'), '/funds/fund-1/activity');
    expect(
      AppRoutes.createContributionPath('fund-1'),
      '/funds/fund-1/contributions/new',
    );
  });
}
