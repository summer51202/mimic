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
  late final TextEditingController _displayNameController;
  bool _isRegistering = false;
  String? _displayNameError;
  String? _emailError;
  String? _passwordError;

  @override
  void initState() {
    super.initState();
    _emailController = TextEditingController();
    _passwordController = TextEditingController();
    _displayNameController = TextEditingController();
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmit() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (!_validateForm(email: email, password: password)) {
      return;
    }
    final controller = ref.read(authControllerProvider.notifier);
    final bool success = _isRegistering
        ? await controller.register(
            displayName: _displayNameController.text.trim(),
            email: email,
            password: password,
          )
        : await controller.login(email: email, password: password);

    if (!mounted || !success) {
      return;
    }

    context.go(AppRoutes.home);
  }

  bool _validateForm({required String email, required String password}) {
    final displayName = _displayNameController.text.trim();
    final emailIsValid = RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(email);
    setState(() {
      _displayNameError = _isRegistering && displayName.isEmpty
          ? 'Display name is required.'
          : null;
      _emailError = email.isEmpty
          ? 'Email is required.'
          : (!emailIsValid ? 'Enter a valid email address.' : null);
      _passwordError = password.isEmpty
          ? 'Password is required.'
          : (password.length < 6
              ? 'Password must be at least 6 characters.'
              : null);
    });
    return _displayNameError == null &&
        _emailError == null &&
        _passwordError == null;
  }

  void _clearRemoteError() {
    ref.read(authControllerProvider.notifier).clearError();
  }

  void _fillDemoAccount() {
    setState(() {
      _emailController.text = 'demo@pairfund.local';
      _passwordController.text = 'password';
      _emailError = null;
      _passwordError = null;
    });
    _clearRemoteError();
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
                      Text(
                        _isRegistering ? 'Create account' : 'Sign in',
                        style: textTheme.titleLarge,
                      ),
                      const SizedBox(height: PfSpacing.xs),
                      Text(
                        _isRegistering
                            ? 'Create an account to join shared funds with your partner or group.'
                            : 'Use your account to continue to shared funds, records, and settlement tasks.',
                        style: textTheme.bodyMedium,
                      ),
                      const SizedBox(height: PfSpacing.lg),
                      LoginForm(
                        displayNameController: _displayNameController,
                        emailController: _emailController,
                        passwordController: _passwordController,
                        isRegistering: _isRegistering,
                        displayNameError: _displayNameError,
                        emailError: _emailError,
                        passwordError: _passwordError,
                        onDisplayNameChanged: (_) {
                          setState(() => _displayNameError = null);
                          _clearRemoteError();
                        },
                        onEmailChanged: (_) {
                          setState(() => _emailError = null);
                          _clearRemoteError();
                        },
                        onPasswordChanged: (_) {
                          setState(() => _passwordError = null);
                          _clearRemoteError();
                        },
                        isSubmitting: authState.isSubmitting,
                        errorMessage: authState.errorMessage,
                        onSubmit: _handleSubmit,
                      ),
                      if (!_isRegistering) ...<Widget>[
                        const SizedBox(height: PfSpacing.xs),
                        Align(
                          alignment: Alignment.center,
                          child: TextButton(
                            onPressed: authState.isSubmitting
                                ? null
                                : _fillDemoAccount,
                            child: const Text('Use demo account'),
                          ),
                        ),
                      ],
                      const SizedBox(height: PfSpacing.sm),
                      SizedBox(
                        width: double.infinity,
                        child: TextButton(
                          onPressed: authState.isSubmitting
                              ? null
                              : () {
                                  setState(() {
                                    _isRegistering = !_isRegistering;
                                    _displayNameError = null;
                                    _emailError = null;
                                    _passwordError = null;
                                  });
                                  _clearRemoteError();
                                },
                          child: Text(
                            _isRegistering
                                ? 'Already have an account? Sign in'
                                : 'Create account',
                          ),
                        ),
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
