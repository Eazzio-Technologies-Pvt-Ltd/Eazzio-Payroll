// UI/UX v2 — modern premium design — Antigravity 2026
import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

enum ToastType { success, error, info }

class AppToast {
  static void show(BuildContext context, String message, ToastType type) {
    final scaffoldMessenger = ScaffoldMessenger.of(context);
    scaffoldMessenger.hideCurrentSnackBar();

    Color bgColor;
    IconData icon;
    Color progressColor;

    switch (type) {
      case ToastType.success:
        bgColor = AppColors.secondary;
        icon = Icons.check_circle_outline;
        progressColor = Colors.white70;
        break;
      case ToastType.error:
        bgColor = AppColors.error;
        icon = Icons.error_outline;
        progressColor = Colors.white70;
        break;
      case ToastType.info:
        bgColor = const Color(0xFF0F172A);
        icon = Icons.info_outline;
        progressColor = AppColors.primary.withOpacity(0.5);
        break;
    }

    scaffoldMessenger.showSnackBar(
      SnackBar(
        behavior: SnackBarBehavior.floating,
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        backgroundColor: bgColor,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        duration: const Duration(seconds: 3),
        content: SnackBarProgressContent(
          icon: icon,
          message: message,
          progressColor: progressColor,
        ),
      ),
    );
  }

  static void showSuccess(BuildContext context, String message) => show(context, message, ToastType.success);
  static void showError(BuildContext context, String message) => show(context, message, ToastType.error);
  static void showInfo(BuildContext context, String message) => show(context, message, ToastType.info);
}

class SnackBarProgressContent extends StatefulWidget {
  final IconData icon;
  final String message;
  final Color progressColor;

  const SnackBarProgressContent({
    super.key,
    required this.icon,
    required this.message,
    required this.progressColor,
  });

  @override
  State<SnackBarProgressContent> createState() => _SnackBarProgressContentState();
}

class _SnackBarProgressContentState extends State<SnackBarProgressContent> with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 3),
    );
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Icon(widget.icon, color: Colors.white, size: 20),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                widget.message,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  fontFamily: 'Plus Jakarta Sans',
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return LinearProgressIndicator(
              value: 1.0 - _controller.value,
              backgroundColor: Colors.white.withOpacity(0.2),
              valueColor: AlwaysStoppedAnimation<Color>(widget.progressColor),
              minHeight: 2,
            );
          },
        ),
      ],
    );
  }
}
