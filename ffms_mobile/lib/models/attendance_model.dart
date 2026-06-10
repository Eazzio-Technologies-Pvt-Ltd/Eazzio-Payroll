// Renamed from Check In/Out to Punch In/Out as per v2 spec
class AttendanceModel {
  final String id;
  final String userId;
  final DateTime date;
  final int sessionNumber;
  final DateTime? punchInTime;
  final double? punchInLat;
  final double? punchInLng;
  final DateTime? punchOutTime;
  final double? punchOutLat;
  final double? punchOutLng;
  final String status;
  final double? totalWorkingHours;

  AttendanceModel({
    required this.id,
    required this.userId,
    required this.date,
    this.sessionNumber = 1,
    this.punchInTime,
    this.punchInLat,
    this.punchInLng,
    this.punchOutTime,
    this.punchOutLat,
    this.punchOutLng,
    required this.status,
    this.totalWorkingHours,
  });

  factory AttendanceModel.fromJson(Map<String, dynamic> json) {
    return AttendanceModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      date: DateTime.parse(json['date'] as String),
      sessionNumber: json['sessionNumber'] as int? ?? 1,
      // Renamed from Check In/Out to Punch In/Out as per v2 spec
      punchInTime: json['checkInTime'] != null ? DateTime.parse(json['checkInTime'] as String) : null,
      punchInLat: (json['checkInLatitude'] ?? json['checkInLat']) != null
          ? ((json['checkInLatitude'] ?? json['checkInLat']) as num).toDouble()
          : null,
      punchInLng: (json['checkInLongitude'] ?? json['checkInLng']) != null
          ? ((json['checkInLongitude'] ?? json['checkInLng']) as num).toDouble()
          : null,
      punchOutTime: json['checkOutTime'] != null ? DateTime.parse(json['checkOutTime'] as String) : null,
      punchOutLat: (json['checkOutLatitude'] ?? json['checkOutLat']) != null
          ? ((json['checkOutLatitude'] ?? json['checkOutLat']) as num).toDouble()
          : null,
      punchOutLng: (json['checkOutLongitude'] ?? json['checkOutLng']) != null
          ? ((json['checkOutLongitude'] ?? json['checkOutLng']) as num).toDouble()
          : null,
      status: json['status'] as String,
      totalWorkingHours: json['workingMinutes'] != null
          ? (json['workingMinutes'] as num).toDouble() / 60.0
          : (json['totalWorkingHours'] != null ? (json['totalWorkingHours'] as num).toDouble() : null),
    );
  }
}
