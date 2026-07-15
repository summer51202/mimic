import 'package:flutter/material.dart';

import '../../shared/constants/design_tokens.dart';

ThemeData buildAppTheme() {
  final ColorScheme colorScheme = ColorScheme.fromSeed(
    seedColor: PfColors.accent,
    brightness: Brightness.light,
    primary: PfColors.accent,
    surface: PfColors.surface,
  );

  return ThemeData(
    useMaterial3: true,
    colorScheme: colorScheme,
    scaffoldBackgroundColor: PfColors.appBg,
    textTheme: const TextTheme(
      headlineMedium: TextStyle(
        fontSize: 28,
        fontWeight: FontWeight.w700,
        color: PfColors.inkPrimary,
      ),
      titleLarge: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.w700,
        color: PfColors.inkPrimary,
      ),
      titleMedium: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w600,
        color: PfColors.inkPrimary,
      ),
      bodyLarge: TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.w400,
        color: PfColors.inkPrimary,
      ),
      bodyMedium: TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w400,
        color: PfColors.inkSecondary,
      ),
    ),
    cardTheme: CardThemeData(
      color: PfColors.card,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(PfRadii.card),
      ),
      margin: EdgeInsets.zero,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: PfColors.surface,
      contentPadding: const EdgeInsets.symmetric(
        horizontal: PfSpacing.md,
        vertical: PfSpacing.md,
      ),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PfRadii.chip),
        borderSide: const BorderSide(color: PfColors.lineSoft),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PfRadii.chip),
        borderSide: const BorderSide(color: PfColors.lineSoft),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(PfRadii.chip),
        borderSide: const BorderSide(color: PfColors.accent, width: 1.4),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: PfColors.accent,
        foregroundColor: Colors.white,
        minimumSize: const Size.fromHeight(54),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(PfRadii.cta),
        ),
        textStyle: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.w600,
        ),
      ),
    ),
  );
}
