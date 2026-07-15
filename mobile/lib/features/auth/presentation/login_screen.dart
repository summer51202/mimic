import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router/app_routes.dart';
import '../../../shared/constants/design_tokens.dart';
import '../providers/auth_controller.dart';
import 'widgets/login_form.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  late final TextEditingController _emailController;
  late final TextEditingController _passwordController;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController(text: 'you@example.com');
    _passwordController = TextEditingController(text: 'pairfund-demo');
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final bool success = await ref.read(authControllerProvider.notifier).login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );

    if (!mounted || !success) {
      return;
    }

    context.go(AppRoutes.home);
  }

  @override
  Widget build(BuildContext context) {
    final AuthState authState = ref.watch(authControllerProvider);
    final TextTheme textTheme = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(PfSpacing.xl),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              Text('PairFund', style: textTheme.headlineMedium),
              const SizedBox(height: PfSpacing.sm),
              Text(
                'A warm shared-fund app for everyday couple bookkeeping.',
                style: textTheme.bodyMedium,
              ),
              const SizedBox(height: 40),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(PfSpacing.lg),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Text('Sign in', style: textTheme.titleLarge),
                      const SizedBox(height: PfSpacing.xs),
                      Text(
                        'Use your account to continue to shared funds, records, and settlement tasks.',
                        style: textTheme.bodyMedium,
                      ),
                      const SizedBox(height: PfSpacing.lg),
                      LoginForm(
                        emailController: _emailController,
                        passwordController: _passwordController,
                        isSubmitting: authState.isSubmitting,
                        errorMessage: authState.errorMessage,
                        onSubmit: _handleSubmit,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
