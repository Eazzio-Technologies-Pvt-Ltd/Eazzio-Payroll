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
}

class Territory {
  final String id;
  final String name;

  Territory({required this.id, required this.name});

  factory Territory.fromJson(Map<String, dynamic> json) {
    return Territory(
      id: json['id'] as String,
      name: json['name'] as String,
    );
  }
}

class UserModel {
  final String id;
  final String name;
  final String email;
  final String role;
  final String status;
  final String? employeeId;
  final Organization? organization;
  final Territory? territory;
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
    this.organization,
    this.territory,
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
      organization: json['organization'] != null
          ? Organization.fromJson(json['organization'] as Map<String, dynamic>)
          : null,
      territory: json['territory'] != null
          ? Territory.fromJson(json['territory'] as Map<String, dynamic>)
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
}
