import 'package:flutter/material.dart';

// Staggered list item entrance animation widget - Antigravity 2026
class StaggeredListItem extends StatelessWidget {
  final Widget child;
  final int index;

  const StaggeredListItem({
    super.key,
    required this.child,
    required this.index,
  });

  @override
  Widget build(BuildContext context) {
    // Cap delay so long lists don't wait too long
    final delay = Duration(milliseconds: (index * 50).clamp(0, 300));

    return FutureBuilder<void>(
      future: Future.delayed(delay),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          // Offscreen invisible box before animating
          return Opacity(
            opacity: 0.0,
            child: child, // Keep child to maintain size layout bounds if necessary, or just SizedBox()
          );
        }
        return TweenAnimationBuilder<double>(
          tween: Tween<double>(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 400),
          curve: Curves.easeOut,
          builder: (context, value, animChild) {
            // Staggered list — each item fades + slides up with 50ms offset
            // Capped at 300ms so long lists don't feel slow
            return Opacity(
              opacity: value,
              child: Transform.translate(
                offset: Offset(0, 20 * (1 - value)), // slide up 20px
                child: animChild,
              ),
            );
          },
          child: child,
        );
      },
    );
  }
}
