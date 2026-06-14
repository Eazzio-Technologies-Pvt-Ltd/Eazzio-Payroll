class LeaveModel {
  final String id;
  final String userId;
  final String leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final double totalDays;
  final String reason;
  final String status;
  final String? approvedById;
  final String? approvalNote;
  final String? attachmentUrl;
  final DateTime createdAt;
  // Manager name — parsed from API's nested approvedBy.name field
  // Displays manager name instead of raw approvedById in leave details
  // Falls back to null if API response doesn’t include approvedBy object
  final String? managerName;

  LeaveModel({
    required this.id,
    required this.userId,
    required this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.totalDays,
    required this.reason,
    required this.status,
    this.approvedById,
    this.approvalNote,
    this.attachmentUrl,
    required this.createdAt,
    this.managerName, // optional — present only when API includes approvedBy object
  });

  factory LeaveModel.fromJson(Map<String, dynamic> json) {
    // Defensive parse of nested approvedBy object for manager name
    // API may return: approvedBy: { id: "...", name: "Rahul Kumar" }
    // or just: approvedById: "..."
    final approvedByObj = json['approvedBy'] as Map<String, dynamic>?;
    final parsedManagerName = approvedByObj?['name'] as String?
        ?? approvedByObj?['fullName'] as String?;

    return LeaveModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      leaveType: (json['type'] ?? json['leaveType'] ?? '') as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      totalDays: ((json['totalDays'] ?? 0.0) as num).toDouble(),
      reason: json['reason'] as String? ?? '',
      status: json['status'] as String,
      approvedById: json['approvedById'] as String?
          ?? approvedByObj?['id'] as String?,
      approvalNote: json['approvalNote'] as String?,
      attachmentUrl: json['attachmentUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      managerName: parsedManagerName, // null if API doesn't return approvedBy object
    );
  }
}

class LeaveBalanceModel {
  final String id;
  final String userId;
  final String leaveType;
  final int totalEntitled;
  final int totalUsed;
  final int totalPending;

  LeaveBalanceModel({
    required this.id,
    required this.userId,
    required this.leaveType,
    required this.totalEntitled,
    required this.totalUsed,
    required this.totalPending,
  });

  int get available => totalEntitled - totalUsed - totalPending;

  factory LeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    return LeaveBalanceModel(
      id: (json['id'] as String?) ?? '',
      userId: (json['userId'] as String?) ?? '',
      leaveType: (json['type'] ?? json['leaveType'] ?? '') as String,
      totalEntitled: ((json['allocated'] ?? json['totalEntitled'] ?? 0) as num).toInt(),
      totalUsed: ((json['used'] ?? json['totalUsed'] ?? 0) as num).toInt(),
      totalPending: ((json['totalPending'] ?? 0) as num).toInt(),
    );
  }
}
