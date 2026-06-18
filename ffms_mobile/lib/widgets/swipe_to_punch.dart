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
    ).animate(CurvedAnimation(
      parent: _resetController,
      curve: Curves.easeOutBack,
    ));
    _resetController.forward(from: 0.0);
  }

  @override
  Widget build(BuildContext context) {
    final themeColor = widget.isPunchOut ? const Color(0xFFDC2626) : const Color(0xFF2563EB);
    final gradient = widget.isPunchOut
        ? const LinearGradient(
            colors: [Color(0xFFEF4444), Color(0xFFB91C1C)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          )
        : const LinearGradient(
            colors: [Color(0xFF3B82F6), Color(0xFF1D4ED8)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          );

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
          clipBehavior: Clip.antiAlias,
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(28),
            boxShadow: [
              BoxShadow(
                color: themeColor.withValues(alpha: 0.18),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Loading indicator or Centered text
              Positioned.fill(
                child: widget.isLoading
                    ? Center(
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Positioned(
                              bottom: 0,
                              left: 20,
                              right: 20,
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(2),
                                child: const LinearProgressIndicator(
                                  backgroundColor: Colors.transparent,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                                ),
                              ),
                            ),
                            Text(
                              'Connecting to server...',
                              style: GoogleFonts.inter(
                                color: Colors.white.withValues(alpha: 0.9),
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ],
                        ),
                      )
                    : Opacity(
                        opacity: textOpacity,
                        child: Padding(
                          padding: const EdgeInsets.only(left: 54.0, right: 12.0),
                          child: Center(
                            child: FittedBox(
                              fit: BoxFit.scaleDown,
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Text(
                                    '>  >  >  ',
                                    style: GoogleFonts.inter(
                                      color: Colors.white.withValues(alpha: 0.4),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      letterSpacing: 2,
                                    ),
                                  ),
                                  Text(
                                    widget.text,
                                    style: GoogleFonts.inter(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
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
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      widget.isLoading
                          ? Icons.sync
                          : Icons.keyboard_double_arrow_right_rounded,
                      color: themeColor,
                      size: 22,
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
