abstract final class AppRoutes {
  static const String login = '/login';
  static const String home = '/home';
  static const String createFund = '/funds/new';
  static const String fundDetail = '/funds/:fundId';
  static const String fundActivity = '/funds/:fundId/activity';
  static const String createContribution = '/funds/:fundId/contributions/new';
  static const String createExpense = '/funds/:fundId/expenses/new';
  static const String createCorrection = '/funds/:fundId/corrections/new';
  static const String settlement = '/funds/:fundId/settlement';
  static const String confirmations = '/confirmations';
  static const String settings = '/settings';

  static String fundDetailPath(String fundId) => '/funds/$fundId';
  static String fundActivityPath(String fundId) => '/funds/$fundId/activity';
  static String createContributionPath(String fundId) =>
      '/funds/$fundId/contributions/new';
  static String createExpensePath(String fundId) =>
      '/funds/$fundId/expenses/new';
  static String createCorrectionPath(String fundId) =>
      '/funds/$fundId/corrections/new';
  static String settlementPath(String fundId) => '/funds/$fundId/settlement';
}
