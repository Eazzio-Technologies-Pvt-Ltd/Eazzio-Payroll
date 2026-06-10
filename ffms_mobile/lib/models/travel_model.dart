/// Represents a single day's travel/odometer log
class TravelLogModel {
  final String id;
  final String userId;
  final DateTime date;
  final double totalDistanceKm;
  final double? meterStart;
  final double? meterEnd;
  final String? proofImageUrl;
  final double allowanceAmount;
  final double allowanceRate;
  final String? notes;
  final DateTime? createdAt;

  TravelLogModel({
    required this.id,
    required this.userId,
    required this.date,
    required this.totalDistanceKm,
    this.meterStart,
    this.meterEnd,
    this.proofImageUrl,
    required this.allowanceAmount,
    required this.allowanceRate,
    this.notes,
    this.createdAt,
  });

  factory TravelLogModel.fromJson(Map<String, dynamic> json) {
    final rate = (json['allowanceRate'] as num?)?.toDouble() ?? 4.0;
    final distKm = (json['totalDistanceKm'] as num?)?.toDouble() ?? 0.0;
    final allowance = (json['allowanceAmount'] as num?)?.toDouble() ?? (distKm * rate);

    return TravelLogModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      date: DateTime.parse(json['date'] as String),
      totalDistanceKm: distKm,
      meterStart: (json['meterStart'] as num?)?.toDouble(),
      meterEnd: (json['meterEnd'] as num?)?.toDouble(),
      proofImageUrl: json['proofImageUrl'] as String?,
      allowanceAmount: allowance,
      allowanceRate: rate,
      notes: json['notes'] as String?,
      createdAt: json['createdAt'] != null ? DateTime.parse(json['createdAt'] as String) : null,
    );
  }
}

/// Monthly attendance summary for a single user
class AttendanceMonthlySummary {
  final int present;
  final int absent;
  final int leave;
  final int totalWorkingDays;
  final int month;
  final int year;

  AttendanceMonthlySummary({
    required this.present,
    required this.absent,
    required this.leave,
    required this.totalWorkingDays,
    required this.month,
    required this.year,
  });

  factory AttendanceMonthlySummary.fromJson(Map<String, dynamic> json) {
    return AttendanceMonthlySummary(
      present: (json['present'] as num?)?.toInt() ?? 0,
      absent: (json['absent'] as num?)?.toInt() ?? 0,
      leave: (json['leave'] as num?)?.toInt() ?? 0,
      totalWorkingDays: (json['totalWorkingDays'] as num?)?.toInt() ?? 0,
      month: (json['month'] as num?)?.toInt() ?? DateTime.now().month,
      year: (json['year'] as num?)?.toInt() ?? DateTime.now().year,
    );
  }
}
