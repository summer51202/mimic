import 'package:flutter/material.dart';

abstract final class PfColors {
  static const Color appBg = Color(0xFFF7F1EA);
  static const Color canvasBg = Color(0xFFF4ECE4);
  static const Color surface = Color(0xFFFFF8F2);
  static const Color card = Color(0xFFFFFFFF);
  static const Color inkPrimary = Color(0xFF2F241F);
  static const Color inkSecondary = Color(0xFF6F5B52);
  static const Color accent = Color(0xFFD7795F);
  static const Color accentSoft = Color(0xFFF2D7C9);
  static const Color successSoft = Color(0xFFDCEAD9);
  static const Color warningSoft = Color(0xFFF6E4C8);
  static const Color lineSoft = Color(0xFFE7D9CC);
}

abstract final class PfSpacing {
  static const double xs = 8;
  static const double sm = 12;
  static const double md = 16;
  static const double lg = 20;
  static const double xl = 24;
}

abstract final class PfRadii {
  static const double hero = 24;
  static const double card = 22;
  static const double chip = 14;
  static const double cta = 22;
}
