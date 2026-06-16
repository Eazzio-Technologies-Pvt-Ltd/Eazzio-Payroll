import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const StatusBadge({
    super.key,
    required this.status,
    this.fontSize = 11,
  });

  @override
  Widget build(BuildContext context) {
    Color color;
    Color bgColor;

    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'APPROVED':
      case 'ON_DUTY':
      case 'PRESENT':
      case 'ACTIVE':
        color = const Color(0xFF007230);
        bgColor = const Color(0xFF7CF994).withOpacity(0.15);
        break;
      case 'PENDING':
      case 'DRAFT':
      case 'SUBMITTED':
      case 'CASUAL':
      case 'SICK':
      case 'PLANNED':
      case 'LATE':
      case 'HALF_DAY':
        color = const Color(0xFF8E3C00);
        bgColor = const Color(0xFFFFDBCA).withOpacity(0.4);
        break;
      case 'IN_PROGRESS':
        color = const Color(0xFF004AC6);
        bgColor = const Color(0xFFDBE1FF).withOpacity(0.5);
        break;
      case 'REJECTED':
      case 'MISSED':
      case 'HIGH':
      case 'URGENT':
      case 'OFF_DUTY':
      case 'ABSENT':
        color = const Color(0xFFBA1A1A);
        bgColor = const Color(0xFFFFDAD6).withOpacity(0.6);
        break;
      default:
        color = const Color(0xFF434655);
        bgColor = const Color(0xFFECEEF0);
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(999), // pill shape
      ),
      child: Text(
        status.replaceAll('_', ' ').toUpperCase(),
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
