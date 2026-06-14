// responsive.dart — Dynamic sizing helper for FFMS Mobile
// Replaces all hardcoded pixel values throughout the app.
// Usage:
//   final r = Responsive(context);
//   Text('Hello', style: TextStyle(fontSize: r.fontMD))
//   Padding(padding: r.horizontalPadding)
//
// All sizes are relative to screen width so they scale
// correctly on every Android device from 360px to 430px.

import 'package:flutter/material.dart';

class Responsive {
  final BuildContext context;
  late final double width;
  late final double height;
  late final double pixelRatio;

  Responsive(this.context) {
    final media = MediaQuery.of(context);
    width = media.size.width;
    height = media.size.height;
    pixelRatio = media.devicePixelRatio;
  }

  // ── Font sizes — scale with screen width ──────────────────────────
  double get fontXS    => width * 0.030; // ~11px on 360px
  double get fontSM    => width * 0.033; // ~12px
  double get fontMD    => width * 0.038; // ~14px
  double get fontLG    => width * 0.044; // ~16px
  double get fontXL    => width * 0.050; // ~18px
  double get fontXXL   => width * 0.060; // ~22px
  double get fontTitle => width * 0.072; // ~26px

  // ── Spacing — scale with screen width ────────────────────────────
  double get spaceXS => width * 0.011; // ~4px
  double get spaceSM => width * 0.022; // ~8px
  double get spaceMD => width * 0.044; // ~16px
  double get spaceLG => width * 0.066; // ~24px
  double get spaceXL => width * 0.088; // ~32px

  // ── Container sizing ──────────────────────────────────────────────
  double get cardPadding   => width * 0.044; // ~16px card inner padding
  double get screenPadding => width * 0.044; // ~16px page-level padding
  double get iconSizeSM    => width * 0.050; // ~18px small icon
  double get iconSizeMD    => width * 0.060; // ~22px medium icon
  double get iconSizeLG    => width * 0.080; // ~29px large icon

  // ── Logo sizing ───────────────────────────────────────────────────
  // Logo size uses 28% of screen width — responsive on all devices
  // fit: BoxFit.contain ensures no cropping or distortion
  double get logoSize => width * 0.28;

  // ── Screen size categories ────────────────────────────────────────
  bool get isSmall  => width < 380;  // e.g. 360px phones
  bool get isMedium => width < 410;  // e.g. 390px phones
  bool get isLarge  => width >= 410; // e.g. 430px phones

  // ── Safe horizontal padding ───────────────────────────────────────
  EdgeInsets get horizontalPadding => EdgeInsets.symmetric(
    horizontal: screenPadding,
  );

  // ── Vertical safe area padding ────────────────────────────────────
  EdgeInsets get screenPaddingAll => EdgeInsets.all(screenPadding);
}
