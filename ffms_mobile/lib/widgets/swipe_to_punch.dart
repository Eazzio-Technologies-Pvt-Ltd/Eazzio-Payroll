import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class SwipeToPunch extends StatefulWidget {
  final String text;
  final bool isPunchOut;
  final Future<dynamic> Function() onConfirm;
  final bool isLoading;

  const SwipeToPunch({
    super.key,
    required this.text,
    required this.isPunchOut,
    required this.onConfirm,
    this.isLoading = false,
  });

  @override
  State<SwipeToPunch> createState() => _SwipeToPunchState();
}

class _SwipeToPunchState extends State<SwipeToPunch> with SingleTickerProviderStateMixin {
  double _dragPosition = 0.0;
  late AnimationController _resetController;
  late Animation<double> _resetAnimation;

  @override
  void initState() {
    super.initState();
    _resetController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 250),
    );
    _resetController.addListener(() {
      setState(() {
        _dragPosition = _resetAnimation.value;
      });
    });
  }

  @override
  void dispose() {
    _resetController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(SwipeToPunch oldWidget) {
    super.didUpdateWidget(oldWidget);
    // If loading status finished, reset drag position back to 0
    if (oldWidget.isLoading && !widget.isLoading) {
      _resetToStart();
    }
  }

  void _resetToStart() {
    _resetAnimation = Tween<double>(
      begin: _dragPosition,
      end: 0.0,
    ).animate(CurvedAnimation(parent: _resetController, curve: Curves.easeOut));
    _resetController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = widget.isPunchOut ? const Color(0xFFDC2626) : const Color(0xFF059669);
    final bgColor = widget.isPunchOut ? const Color(0xFFFEF2F2) : const Color(0xFFECFDF5);
    final borderColor = widget.isPunchOut ? const Color(0xFFFCA5A5) : const Color(0xFF6EE7B7);

    return LayoutBuilder(
      builder: (context, constraints) {
        final trackWidth = constraints.maxWidth;
        const thumbSize = 48.0;
        const padding = 4.0;
        final maxDragDistance = trackWidth - thumbSize - (2 * padding);

        // Calculate opacity of the text based on drag position (fade out as thumb approaches)
        final double progress = maxDragDistance > 0 ? _dragPosition / maxDragDistance : 0.0;
        final double textOpacity = (1.0 - (progress * 1.5)).clamp(0.0, 1.0);

        return Container(
          width: double.infinity,
          height: 56,
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: borderColor, width: 1.5),
            boxShadow: [
              BoxShadow(
                color: themeColor.withOpacity(0.06),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Loading indicator or Centered text
              Positioned.fill(
                child: Center(
                  child: widget.isLoading
                      ? SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.5,
                            valueColor: AlwaysStoppedAnimation<Color>(themeColor),
                          ),
                        )
                      : Opacity(
                          opacity: textOpacity,
                          child: Text(
                            widget.text,
                            style: GoogleFonts.inter(
                              color: themeColor,
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                ),
              ),

              // Draggable thumb
              Positioned(
                left: padding + _dragPosition,
                top: padding,
                bottom: padding,
                child: GestureDetector(
                  onHorizontalDragUpdate: widget.isLoading
                      ? null
                      : (details) {
                          _resetController.stop();
                          setState(() {
                            _dragPosition += details.delta.dx;
                            if (_dragPosition < 0) _dragPosition = 0.0;
                            if (_dragPosition > maxDragDistance) _dragPosition = maxDragDistance;
                          });
                        },
                  onHorizontalDragEnd: widget.isLoading
                      ? null
                      : (details) async {
                          final threshold = maxDragDistance * 0.75;
                          if (_dragPosition >= threshold) {
                            // Snap to end
                            setState(() {
                              _dragPosition = maxDragDistance;
                            });
                            try {
                              final result = await widget.onConfirm();
                              if (result == false) {
                                _resetToStart();
                              }
                            } catch (_) {
                              _resetToStart();
                            }
                          } else {
                            _resetToStart();
                          }
                        },
                  child: Container(
                    width: thumbSize,
                    height: thumbSize,
                    decoration: BoxDecoration(
                      color: themeColor,
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: themeColor.withOpacity(0.35),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      widget.isLoading
                          ? Icons.sync
                          : (widget.isPunchOut ? Icons.logout : Icons.double_arrow),
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
