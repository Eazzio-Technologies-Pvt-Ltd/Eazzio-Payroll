class CommentModel {
  final String id;
  final String content;
  final String taskId;
  final String userId;
  final String userName;
  final DateTime createdAt;

  CommentModel({
    required this.id,
    required this.content,
    required this.taskId,
    required this.userId,
    required this.userName,
    required this.createdAt,
  });

  factory CommentModel.fromJson(Map<String, dynamic> json) {
    return CommentModel(
      id: json['id'] as String,
      content: json['content'] as String,
      taskId: json['taskId'] as String,
      userId: json['userId'] as String,
      userName: json['user'] != null ? json['user']['name'] as String : 'Unknown',
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}

class TaskAssignmentModel {
  final String id;
  final String taskId;
  final String userId;
  final String status;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final String? completionNote;

  TaskAssignmentModel({
    required this.id,
    required this.taskId,
    required this.userId,
    required this.status,
    this.startedAt,
    this.completedAt,
    this.completionNote,
  });

  factory TaskAssignmentModel.fromJson(Map<String, dynamic> json) {
    return TaskAssignmentModel(
      id: (json['id'] as String?) ?? '',
      taskId: (json['taskId'] as String?) ?? '',
      userId: (json['userId'] as String?) ?? '',
      status: (json['status'] as String?) ?? 'ASSIGNED',
      startedAt: json['acceptedAt'] != null
          ? DateTime.parse(json['acceptedAt'] as String)
          : (json['startedAt'] != null ? DateTime.parse(json['startedAt'] as String) : null),
      completedAt:
          json['completedAt'] != null ? DateTime.parse(json['completedAt'] as String) : null,
      completionNote: json['completionNote'] as String?,
    );
  }
}

/// Represents who created/assigned a task — used for "Assigned By" display
class TaskCreatorModel {
  final String id;
  final String name;
  final String role;

  TaskCreatorModel({required this.id, required this.name, required this.role});

  factory TaskCreatorModel.fromJson(Map<String, dynamic> json) {
    return TaskCreatorModel(
      id: (json['id'] as String?) ?? '',
      name: (json['name'] as String?) ?? 'Unknown',
      role: (json['role'] as String?) ?? 'ADMIN',
    );
  }

  String get displayRole {
    switch (role) {
      case 'ADMIN':
        return 'Super Admin';
      case 'MANAGER':
        return 'Manager';
      case 'FIELD_STAFF':
        return 'Field Staff';
      default:
        return role.replaceAll('_', ' ');
    }
  }
}

class TaskModel {
  final String id;
  final String title;
  final String? description;
  final String priority;
  final String status;
  final String? territoryId;
  final String? territoryName;
  final String? projectId;
  final String? projectName;
  final DateTime? dueDate;
  final DateTime createdAt;
  final List<TaskAssignmentModel> assignments;
  final TaskCreatorModel? createdBy;
  // is_personal flag tells backend to hide this from admin/manager
  final bool isPersonal;

  TaskModel({
    required this.id,
    required this.title,
    this.description,
    required this.priority,
    required this.status,
    this.territoryId,
    this.territoryName,
    this.projectId,
    this.projectName,
    this.dueDate,
    required this.createdAt,
    required this.assignments,
    this.createdBy,
    this.isPersonal = false,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    final assignmentsList = json['assignments'] as List? ?? [];
    final mappedAssignments = assignmentsList
        .map((a) => TaskAssignmentModel.fromJson(a as Map<String, dynamic>))
        .toList();

    return TaskModel(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      priority: json['priority'] as String,
      status: json['status'] as String,
      territoryId: json['territoryId'] as String?,
      territoryName: json['territory'] != null ? json['territory']['name'] as String? : null,
      projectId: json['projectId'] as String?,
      projectName: json['project'] != null ? json['project']['name'] as String? : null,
      dueDate: json['dueDate'] != null ? DateTime.parse(json['dueDate'] as String) : null,
      createdAt: DateTime.parse(json['createdAt'] as String),
      assignments: mappedAssignments,
      createdBy: json['createdBy'] != null
          ? TaskCreatorModel.fromJson(json['createdBy'] as Map<String, dynamic>)
          : null,
      // is_personal flag — read from backend or default false
      isPersonal: json['isPersonal'] as bool? ?? false,
    );
  }
}
