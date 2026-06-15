import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import '../models/expense_model.dart';
import '../core/utils/responsive.dart';
import '../core/theme/app_theme.dart';
import '../providers/expense_provider.dart';

// Expense Detail Screen - Antigravity 2026
// Shows full details of a single expense with status, receipt, and manager details
class ExpenseDetailScreen extends StatefulWidget {
  final ExpenseModel expense;

  const ExpenseDetailScreen({
    Key? key,
    required this.expense,
  }) : super(key: key);

  @override
  State<ExpenseDetailScreen> createState() => _ExpenseDetailScreenState();
}

class _ExpenseDetailScreenState extends State<ExpenseDetailScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    // Entrance animation — fade + slide from bottom
    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    ));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = Responsive(context);
    final expense = widget.expense;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Expense Details',
          style: GoogleFonts.inter(fontSize: r.fontLG, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        backgroundColor: AppColors.surface,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: AppColors.textPrimary),
          onPressed: () => Navigator.pop(context),
        ),
        elevation: 0.5,
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusBanner(context, r, expense),
                const SizedBox(height: 16),
                _buildAmountCard(context, r, expense),
                const SizedBox(height: 16),
                _buildDetailsCard(context, r, expense),
                const SizedBox(height: 16),
                if (expense.receiptUrl != null && expense.receiptUrl!.isNotEmpty)
                  _buildReceiptCard(context, r, expense),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBanner(BuildContext context, Responsive r, ExpenseModel expense) {
    Color statusColor;
    IconData statusIcon;
    String statusLabel;

    switch (expense.status.toUpperCase()) {
      case 'APPROVED':
        statusColor = const Color(0xFF10B981);
        statusIcon = Icons.check_circle_rounded;
        statusLabel = 'Approved';
        break;
      case 'REJECTED':
        statusColor = const Color(0xFFEF4444);
        statusIcon = Icons.cancel_rounded;
        statusLabel = 'Rejected';
        break;
      case 'PENDING':
      case 'SUBMITTED':
        statusColor = const Color(0xFFF59E0B);
        statusIcon = Icons.hourglass_top_rounded;
        statusLabel = 'Pending Review';
        break;
      case 'DRAFT':
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.edit_note_rounded;
        statusLabel = 'Draft';
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: statusColor.withOpacity(0.10),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: statusColor.withOpacity(0.35)),
      ),
      child: Row(
        children: [
          Icon(statusIcon, color: statusColor, size: 24),
          const SizedBox(width: 12),
          Text(
            statusLabel,
            style: GoogleFonts.inter(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: statusColor,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAmountCard(BuildContext context, Responsive r, ExpenseModel expense) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'CLAIM AMOUNT',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 8),
          Text(
            '₹ ${expense.amount.toStringAsFixed(2)}',
            style: GoogleFonts.inter(
              fontSize: 28,
              fontWeight: FontWeight.w800,
              color: AppColors.primary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsCard(BuildContext context, Responsive r, ExpenseModel expense) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildDetailRow(r, 'Title', expense.title),
          _buildDivider(),
          _buildDetailRow(r, 'Category', expense.category),
          _buildDivider(),
          _buildDetailRow(r, 'Date', DateFormat('dd MMMM yyyy').format(expense.date)),
          _buildDivider(),
          _buildDetailRow(r, 'Description', expense.description ?? 'No description provided'),
          _buildDivider(),
          
          // Manager Name Row (Option A/B integrated)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 12.0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 110,
                  child: Text(
                    'Submitted To',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: expense.managerName != null && expense.managerName!.isNotEmpty
                      ? Text(
                          expense.managerName!,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.textPrimary,
                          ),
                          overflow: TextOverflow.ellipsis,
                          maxLines: 2,
                        )
                      : (expense.approvedById != null && expense.approvedById!.isNotEmpty
                          ? FutureBuilder<String>(
                              future: Provider.of<ExpenseProvider>(context, listen: false)
                                  .getManagerName(expense.approvedById!),
                              builder: (context, snapshot) {
                                return Text(
                                  snapshot.data ?? 'Loading...',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                  maxLines: 2,
                                );
                              },
                            )
                          : Text(
                              'Manager',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: AppColors.textPrimary,
                              ),
                            )),
                ),
              ],
            ),
          ),
          
          if (expense.approvalNote != null && expense.approvalNote!.isNotEmpty) ...[
            _buildDivider(),
            _buildDetailRow(
              r,
              expense.status.toUpperCase() == 'REJECTED' ? 'Rejection Note' : 'Approval Note',
              expense.approvalNote!,
              valueColor: expense.status.toUpperCase() == 'REJECTED' ? AppColors.error : AppColors.success,
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDetailRow(Responsive r, String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: valueColor ?? AppColors.textPrimary,
              ),
              overflow: TextOverflow.ellipsis,
              maxLines: 5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDivider() => const Divider(height: 1, thickness: 0.5, color: AppColors.outlineVariant);

  Widget _buildReceiptCard(BuildContext context, Responsive r, ExpenseModel expense) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16.0),
      decoration: AppTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'RECEIPT ATTACHMENT',
            style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textTertiary),
          ),
          const SizedBox(height: 12),
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: Image.network(
              expense.receiptUrl!,
              width: double.infinity,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Container(
                height: 120,
                color: Colors.grey[100],
                child: Center(
                  child: Text(
                    'Receipt not available',
                    style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
