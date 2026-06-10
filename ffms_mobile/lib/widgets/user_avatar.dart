import 'package:flutter/material.dart';

/// UserAvatar widget — shows profile photo if available,
/// falls back to initials if photo URL is null or fails to load
/// Used everywhere in the app that shows an employee avatar
class UserAvatar extends StatelessWidget {
  final String? photoUrl;
  final String name;
  final double radius;
  final Color? backgroundColor;
  final VoidCallback? onTap;

  const UserAvatar({
    super.key,
    required this.photoUrl,
    required this.name,
    required this.radius,
    this.backgroundColor,
    this.onTap,
  });

  String _getInitials(String name) {
    if (name.trim().isEmpty) return '';
    final parts = name.trim().split(RegExp(r'\s+'));
    if (parts.length == 1) {
      return parts[0].substring(0, 1).toUpperCase();
    }
    final first = parts.first.substring(0, 1).toUpperCase();
    final last = parts.last.substring(0, 1).toUpperCase();
    return '$first$last';
  }

  Color _getBackgroundColor(String name) {
    if (name.isEmpty) return Colors.grey;
    int hash = 0;
    for (int i = 0; i < name.length; i++) {
      hash = name.codeUnitAt(i) + ((hash << 5) - hash);
    }
    final double hue = (hash.abs() % 360).toDouble();
    return HSLColor.fromAHSL(1.0, hue, 0.6, 0.4).toColor();
  }

  @override
  Widget build(BuildContext context) {
    final cleanPhotoUrl = (photoUrl != null && photoUrl!.trim().isNotEmpty) ? photoUrl!.trim() : null;

    final avatar = CircleAvatar(
      radius: radius,
      backgroundColor: backgroundColor ?? _getBackgroundColor(name),
      foregroundImage: cleanPhotoUrl != null ? NetworkImage(cleanPhotoUrl) : null,
      onForegroundImageError: cleanPhotoUrl != null
          ? (exception, stackTrace) {
              debugPrint('Failed to load user avatar image: $exception');
            }
          : null,
      child: Text(
        _getInitials(name),
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: Colors.white,
          fontSize: radius * 0.75, // Adjust font size relative to circle radius
        ),
      ),
    );

    if (onTap != null) {
      return GestureDetector(
        onTap: onTap,
        child: avatar,
      );
    }

    // Falls back to initials if photo URL is null or image fails to load
    return avatar;
  }
}
