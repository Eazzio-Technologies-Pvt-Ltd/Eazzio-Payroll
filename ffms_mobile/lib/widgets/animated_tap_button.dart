import 'package:flutter/material.dart';

// Button tap scale animation widget - Antigravity 2026
class AnimatedTapButton extends StatefulWidget {
  final Widget child;
  final VoidCallback onTap;
  final BorderRadius? borderRadius;
  final List<BoxShadow>? boxShadow;

  const AnimatedTapButton({
    super.key,
    required this.child,
    required this.onTap,
    this.borderRadius,
    this.boxShadow,
  });

  @override
  State<AnimatedTapButton> createState() => _AnimatedTapButtonState();
}

class _AnimatedTapButtonState extends State<AnimatedTapButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  bool _isPressed = false;

  @override
  void initState() {
    super.initState();
    // Enhanced: scale 0.93 over 80ms
    _controller = AnimationController(
      duration: const Duration(milliseconds: 80),
      vsync: this,
      lowerBound: 0.93,
      upperBound: 1.0,
      value: 1.0,
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) {
        _controller.reverse();
        setState(() => _isPressed = true);
      },
      onTapUp: (_) {
        _controller.forward();
        setState(() => _isPressed = false);
        widget.onTap();
      },
      onTapCancel: () {
        _controller.forward();
        setState(() => _isPressed = false);
      },
      child: ScaleTransition(
        scale: _controller,
        child: widget.boxShadow != null
            ? AnimatedContainer(
                duration: const Duration(milliseconds: 80),
                decoration: BoxDecoration(
                  borderRadius: widget.borderRadius ?? BorderRadius.circular(12),
                  boxShadow: _isPressed
                      ? [] // shadow removed on press — adds physical depth feel
                      : widget.boxShadow, // restores on release — completes the spring feedback
                ),
                child: widget.child,
              )
            : widget.child,
      ),
    );
  }
}
