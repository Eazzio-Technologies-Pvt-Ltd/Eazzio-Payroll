class ExpenseModel {
  final String id;
  final String userId;
  final String title;
  final double amount;
  final String category;
  final DateTime date;
  final String? description;
  final String? receiptUrl;
  final String status;
  final String? approvedById;
  final String? approvalNote;
  final DateTime createdAt;

  ExpenseModel({
    required this.id,
    required this.userId,
    required this.title,
    required this.amount,
    required this.category,
    required this.date,
    this.description,
    this.receiptUrl,
    required this.status,
    this.approvedById,
    this.approvalNote,
    required this.createdAt,
  });

  factory ExpenseModel.fromJson(Map<String, dynamic> json) {
    return ExpenseModel(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String? ?? json['description'] as String? ?? json['category'] as String,
      amount: (json['amount'] as num).toDouble(),
      category: json['category'] as String,
      date: DateTime.parse(json['date'] as String),
      description: json['description'] as String?,
      receiptUrl: json['receiptUrl'] as String?,
      status: json['status'] as String,
      approvedById: json['approvedById'] as String?,
      approvalNote: json['approvalNote'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }
}
