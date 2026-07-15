import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/activity/presentation/activity_screen.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/contributions/presentation/create_contribution_screen.dart';
import '../../features/corrections/presentation/create_correction_screen.dart';
import '../../features/expenses/presentation/create_expense_screen.dart';
import '../../features/funds/presentation/create_fund_screen.dart';
import '../../features/funds/presentation/fund_detail_screen.dart';
import '../../features/home/presentation/home_dashboard_screen.dart';
import '../../features/settings/presentation/settings_screen.dart';
import '../../features/settlements/presentation/settlement_screen.dart';
import '../../features/tasks/presentation/tasks_screen.dart';
import '../../shared/providers/session_provider.dart';
import 'app_routes.dart';

final appRouterProvider = Provider<GoRouter>((Ref ref) {
  final session = ref.watch(sessionProvider);

  return GoRouter(
    initialLocation: AppRoutes.login,
    redirect: (BuildContext context, GoRouterState state) {
      final bool isOnLogin = state.matchedLocation == AppRoutes.login;

      if (!session.isAuthenticated && !isOnLogin) {
        return AppRoutes.login;
      }

      if (session.isAuthenticated && isOnLogin) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: <RouteBase>[
      GoRoute(
        path: AppRoutes.login,
        name: 'login',
        builder: (BuildContext context, GoRouterState state) {
          return const LoginScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.home,
        name: 'home',
        builder: (BuildContext context, GoRouterState state) {
          return const HomeDashboardScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.createFund,
        name: 'create-fund',
        builder: (BuildContext context, GoRouterState state) {
          return const CreateFundScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.fundDetail,
        name: 'fund-detail',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return FundDetailScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.fundActivity,
        name: 'fund-activity',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return ActivityScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.createContribution,
        name: 'create-contribution',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return CreateContributionScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.createExpense,
        name: 'create-expense',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return CreateExpenseScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.createCorrection,
        name: 'create-correction',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return CreateCorrectionScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.settlement,
        name: 'settlement',
        builder: (BuildContext context, GoRouterState state) {
          final String fundId = state.pathParameters['fundId']!;
          return SettlementScreen(fundId: fundId);
        },
      ),
      GoRoute(
        path: AppRoutes.confirmations,
        name: 'confirmations',
        builder: (BuildContext context, GoRouterState state) {
          return const TasksScreen();
        },
      ),
      GoRoute(
        path: AppRoutes.settings,
        name: 'settings',
        builder: (BuildContext context, GoRouterState state) {
          return const SettingsScreen();
        },
      ),
    ],
  );
});
