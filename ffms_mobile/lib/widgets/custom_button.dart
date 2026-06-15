import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import 'animated_tap_button.dart';

// Modern gradient primary button with shadow and premium tap micro-animation
class CustomButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final bool isLoading;
  final IconData? icon;
  final Color? backgroundColor;
  final Color? textColor;
  final double height;
  final BorderSide? side;

  const CustomButton({
    super.key,
    required this.text,
    this.onPressed,
    this.isLoading = false,
    this.icon,
    this.backgroundColor,
    this.textColor,
    this.height = 52, // Modernized default height
    this.side,
  });

  @override
  Widget build(BuildContext context) {
    final bool hasCustomBg = backgroundColor != null;
    final fg = textColor ?? Colors.white;
    final bool isButtonEnabled = onPressed != null && !isLoading;

    final childWidget = Container(
      width: double.infinity,
      height: height,
      decoration: BoxDecoration(
        gradient: hasCustomBg ? null : AppTheme.headerGradient,
        color: hasCustomBg ? backgroundColor : null,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        border: side != null ? Border.fromBorderSide(side!) : null,
        boxShadow: (hasCustomBg || isButtonEnabled) ? null : AppTheme.buttonShadow,
      ),
      alignment: Alignment.center,
      child: isLoading
          ? SizedBox(
              height: 20,
              width: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2.0,
                valueColor: AlwaysStoppedAnimation<Color>(fg),
              ),
            )
          : Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                if (icon != null) ...[
                  Icon(icon, size: 18, color: fg),
                  const SizedBox(width: 8),
                ],
                Text(
                  text,
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: fg,
                    letterSpacing: 0.3,
                  ),
                ),
              ],
            ),
    );

    if (isButtonEnabled) {
      return AnimatedTapButton(
        onTap: onPressed!,
        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
        boxShadow: hasCustomBg ? null : AppTheme.buttonShadow,
        child: childWidget,
      );
    }

    return Opacity(
      opacity: 0.6,
      child: childWidget,
    );
  }
}
