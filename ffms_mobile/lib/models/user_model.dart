class Organization {
  final String id;
  final String name;

  Organization({required this.id, required this.name});

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
  };
}

class Territory {
  final String id;
  final String name;
  final Map<String, dynamic>? polygon;

  Territory({required this.id, required this.name, this.polygon});

  factory Territory.fromJson(Map<String, dynamic> json) {
    return Territory(
      id: json['id'] as String,
      name: json['name'] as String,
      polygon: json['polygon'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'polygon': polygon,
  };
}

class Shift {
  final String id;
  final String name;
  final String startTime; // Format "HH:MM"
  final String endTime;   // Format "HH:MM"
  final int gracePeriod;
  final double halfDayThreshold;
  final int breakDuration;

  Shift({
    required this.id,
    required this.name,
    required this.startTime,
    required this.endTime,
    this.gracePeriod = 15,
    this.halfDayThreshold = 4.5,
    this.breakDuration = 30,
  });

  factory Shift.fromJson(Map<String, dynamic> json) {
    return Shift(
      id: json['id'] as String,
      name: json['name'] as String,
      startTime: json['startTime'] as String,
      endTime: json['endTime'] as String,
      gracePeriod: json['gracePeriod'] as int? ?? 15,
      halfDayThreshold: (json['halfDayThreshold'] as num?)?.toDouble() ?? 4.5,
      breakDuration: json['breakDuration'] as int? ?? 30,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'startTime': startTime,
    'endTime': endTime,
    'gracePeriod': gracePeriod,
    'halfDayThreshold': halfDayThreshold,
    'breakDuration': breakDuration,
  };
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String status;
  final String? employeeId;
  final String? managerId;
  final Organization? organization;
  final Territory? territory;
  final Shift? shift;
  final String? deviceToken;
  final String? profileImage;
  final DateTime? profileImageLockedAt;
  final double? baseSalary;
  final double? travelAllowanceRate;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    required this.status,
    this.employeeId,
    this.managerId,
    this.organization,
    this.territory,
    this.shift,
    this.deviceToken,
    this.profileImage,
    this.profileImageLockedAt,
    this.baseSalary,
    this.travelAllowanceRate,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: (json['id'] ?? '') as String,
      name: (json['name'] ?? '') as String,
      email: (json['email'] ?? '') as String,
      role: (json['role'] ?? '') as String,
      status: (json['status'] ?? 'ACTIVE') as String,
      employeeId: json['employeeId'] as String?,
      managerId: json['managerId'] as String?,
      organization: json['organization'] != null
          ? Organization.fromJson(json['organization'] as Map<String, dynamic>)
          : null,
      territory: json['territory'] != null
          ? Territory.fromJson(json['territory'] as Map<String, dynamic>)
          : null,
      shift: json['shift'] != null
          ? Shift.fromJson(json['shift'] as Map<String, dynamic>)
          : null,
      deviceToken: json['deviceToken'] as String?,
      profileImage: json['profileImage'] as String?,
      profileImageLockedAt: json['profileImageLockedAt'] != null
          ? DateTime.parse(json['profileImageLockedAt'] as String)
          : null,
      baseSalary: (json['baseSalary'] as num?)?.toDouble(),
      travelAllowanceRate: (json['travelAllowanceRate'] as num?)?.toDouble() ?? 4.0,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'email': email,
    'role': role,
    'status': status,
    'employeeId': employeeId,
    'managerId': managerId,
    'organization': organization?.toJson(),
    'territory': territory?.toJson(),
    'shift': shift?.toJson(),
    'deviceToken': deviceToken,
    'profileImage': profileImage,
    'profileImageLockedAt': profileImageLockedAt?.toIso8601String(),
    'baseSalary': baseSalary,
    'travelAllowanceRate': travelAllowanceRate,
  };
}
