import 'package:flutter/material.dart';

class LoginForm extends StatelessWidget {
  const LoginForm({
    super.key,
    required this.emailController,
    required this.passwordController,
    this.displayNameController,
    this.isRegistering = false,
    this.displayNameError,
    this.emailError,
    this.passwordError,
    required this.onDisplayNameChanged,
    required this.onEmailChanged,
    required this.onPasswordChanged,
    required this.isSubmitting,
    required this.errorMessage,
    required this.onSubmit,
  });

  final TextEditingController emailController;
  final TextEditingController passwordController;
  final TextEditingController? displayNameController;
  final bool isRegistering;
  final String? displayNameError;
  final String? emailError;
  final String? passwordError;
  final ValueChanged<String> onDisplayNameChanged;
  final ValueChanged<String> onEmailChanged;
  final ValueChanged<String> onPasswordChanged;
  final bool isSubmitting;
  final String? errorMessage;
  final VoidCallback onSubmit;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: <Widget>[
        if (isRegistering) ...<Widget>[
          TextField(
            key: const Key('auth-display-name'),
            controller: displayNameController,
            onChanged: onDisplayNameChanged,
            decoration: InputDecoration(
              labelText: 'Display name',
              errorText: displayNameError,
            ),
          ),
          const SizedBox(height: 16),
        ],
        TextField(
          key: const Key('auth-email'),
          controller: emailController,
          onChanged: onEmailChanged,
          keyboardType: TextInputType.emailAddress,
          autocorrect: false,
          decoration: InputDecoration(
            labelText: 'Email',
            hintText: 'you@example.com',
            errorText: emailError,
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          key: const Key('auth-password'),
          controller: passwordController,
          onChanged: onPasswordChanged,
          obscureText: true,
          decoration: InputDecoration(
            labelText: 'Password',
            hintText: 'At least 6 characters',
            errorText: passwordError,
          ),
        ),
        if (errorMessage != null) ...<Widget>[
          const SizedBox(height: 12),
          Text(
            errorMessage!,
            style: TextStyle(
              color: Theme.of(context).colorScheme.error,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          child: ElevatedButton(
            onPressed: isSubmitting ? null : onSubmit,
            child: Text(
              isSubmitting
                  ? (isRegistering ? 'Creating account...' : 'Signing in...')
                  : (isRegistering ? 'Create account' : 'Continue'),
            ),
          ),
        ),
      ],
    );
  }
}
