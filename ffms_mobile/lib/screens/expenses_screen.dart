import 'package:flutter/material.dart';
import '../widgets/skeleton_loader.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/expense_provider.dart';
import '../providers/travel_provider.dart';
import '../widgets/status_badge.dart';
import '../core/theme/app_theme.dart';
import 'add_expense_screen.dart';
import 'expense_detail_screen.dart';
import '../core/utils/responsive.dart';
import '../widgets/staggered_list_item.dart';

// Expenses listing dashboard screen v2 — modern summaries + categorized cards
class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> with SingleTickerProviderStateMixin {
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

    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ExpenseProvider>(context, listen: false).fetchMyExpenses();
      Provider.of<TravelProvider>(context, listen: false).fetchTravelHistory(limit: 30);
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _submitDraft(String id) async {
    final expProvider = Provider.of<ExpenseProvider>(context, listen: false);
    final success = await expProvider.submitExpense(id);
    
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense submitted successfully'), backgroundColor: AppColors.success),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to submit expense'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Widget _buildSummaryRow(String label, double amount, {Color? color, String prefix = '₹', bool isBold = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
              color: isBold ? AppColors.textPrimary : AppColors.textSecondary,
            ),
          ),
          Text(
            '$prefix${amount.toStringAsFixed(0)}',
            style: GoogleFonts.inter(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold || color != null ? FontWeight.bold : FontWeight.w600,
              color: color ?? (isBold ? AppColors.primary : AppColors.textPrimary),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final expenseProvider = Provider.of<ExpenseProvider>(context);
    final travelProvider = Provider.of<TravelProvider>(context);

    final grouped = <String, List<dynamic>>{};
    double totalSubmitted = 0.0;
    double totalApproved = 0.0;
    double totalPending = 0.0;
    double totalRejected = 0.0;

    for (final expense in expenseProvider.expenses) {
      final cat = expense.category.toUpperCase();
      grouped.putIfAbsent(cat, () => []).add(expense);

      final status = expense.status.toUpperCase();
      if (status == 'APPROVED') {
        totalApproved += expense.amount;
      } else if (status == 'PENDING' || status == 'SUBMITTED') {
        totalPending += expense.amount;
      } else if (status == 'REJECTED') {
        totalRejected += expense.amount;
      }
      totalSubmitted += expense.amount;
    }

    final totalTravelAllowance = travelProvider.history.fold<double>(0.0, (sum, log) => sum + log.allowanceAmount);

    List<Widget> listItems = [];

    int itemIndex = 0;
    if (expenseProvider.expenses.isEmpty) {
      listItems.add(
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 32.0),
          child: Center(
            child: Text(
              'No expenses filed yet.',
              style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
            ),
          ),
        ),
      );
    } else {
      grouped.forEach((category, items) {
        final catTotal = items.fold<double>(0.0, (sum, item) => sum + item.amount);
        
        listItems.add(
          Padding(
            padding: const EdgeInsets.only(top: 16.0, bottom: 8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    category,
                    style: GoogleFonts.inter(
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                      color: AppColors.textTertiary,
                      letterSpacing: 0.5,
                    ),
                    overflow: TextOverflow.ellipsis,
                    maxLines: 1,
                  ),
                ),
                Text(
                  'Total: ₹${catTotal.toStringAsFixed(0)}',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
        );

        for (final expense in items) {
          final dateStr = DateFormat('dd MMM yyyy').format(expense.date);
          final amountStr = '₹${expense.amount.toStringAsFixed(0)}';
          
          final currentIndex = itemIndex++;
          listItems.add(
            StaggeredListItem(
              index: currentIndex,
              child: GestureDetector(
              onTap: () {
                // Navigates to ExpenseDetailScreen on tap with slide transition
                Navigator.push(
                  context,
                  PageRouteBuilder(
                    pageBuilder: (_, animation, __) => ExpenseDetailScreen(expense: expense),
                    transitionsBuilder: (_, animation, __, child) {
                      return SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(1.0, 0),
                          end: Offset.zero,
                        ).animate(CurvedAnimation(
                          parent: animation,
                          curve: Curves.easeOutCubic,
                        )),
                        child: child,
                      );
                    },
                    transitionDuration: const Duration(milliseconds: 300),
                  ),
                );
              },
              child: Container(
                decoration: AppTheme.cardDecoration,
                margin: const EdgeInsets.symmetric(vertical: 6),
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Text(
                            expense.title,
                            style: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 14, color: AppColors.textPrimary),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        StatusBadge(status: expense.status),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Flexible(
                          child: Text(
                            '$dateStr | ${expense.description ?? expense.category}',
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                            overflow: TextOverflow.ellipsis,
                            maxLines: 1,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          amountStr,
                          style: GoogleFonts.inter(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        // Submitted To - display name instead of ID
                        Flexible(
                          child: expense.managerName != null && expense.managerName!.isNotEmpty
                              ? Text(
                                  'Submitted to: ${expense.managerName}',
                                  style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textTertiary),
                                  overflow: TextOverflow.ellipsis,
                                )
                              : (expense.approvedById != null && expense.approvedById!.isNotEmpty
                                  ? FutureBuilder<String>(
                                      future: Provider.of<ExpenseProvider>(context, listen: false)
                                          .getManagerName(expense.approvedById!),
                                      builder: (context, snapshot) {
                                        return Text(
                                          'Submitted to: ${snapshot.data ?? 'Loading...'}',
                                          style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textTertiary),
                                          overflow: TextOverflow.ellipsis,
                                        );
                                      },
                                    )
                                  : Text(
                                      'Submitted to: Manager',
                                      style: GoogleFonts.inter(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.textTertiary),
                                      overflow: TextOverflow.ellipsis,
                                    )),
                        ),
                        if (expense.status == 'DRAFT')
                          TextButton(
                            style: TextButton.styleFrom(
                              minimumSize: Size.zero,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () => _submitDraft(expense.id),
                            child: Text('Submit Claim', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
          );
        }
      });
    }

    // Summary Card
    listItems.add(
      Container(
        decoration: AppTheme.cardDecoration,
        margin: const EdgeInsets.only(top: 24, bottom: 12),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'EXPENSE SUMMARY',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.textTertiary),
            ),
            const Divider(height: 20),
            _buildSummaryRow('Total Submitted', totalSubmitted),
            _buildSummaryRow('Total Approved', totalApproved, color: const Color(0xFF10B981)),
            _buildSummaryRow('Total Pending', totalPending, color: const Color(0xFFF59E0B)),
            _buildSummaryRow('Total Rejected', totalRejected, color: const Color(0xFFEF4444)),
          ],
        ),
      ),
    );

    // Salary Impact Card
    listItems.add(
      Container(
        decoration: AppTheme.cardDecoration.copyWith(
          color: AppColors.primarySoft,
          border: Border.all(color: AppColors.primary.withOpacity(0.1)),
        ),
        margin: const EdgeInsets.only(top: 12, bottom: 24),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'SALARY IMPACT',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
            ),
            const Divider(height: 20),
            _buildSummaryRow('Approved Expenses', totalApproved, prefix: '+₹'),
            _buildSummaryRow('Travel Allowance', totalTravelAllowance, prefix: '+₹'),
            const Divider(height: 20),
            _buildSummaryRow('Total Addition to Salary', totalApproved + totalTravelAllowance, prefix: '+₹', isBold: true),
          ],
        ),
      ),
    );

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text('My Expenses', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: AppColors.primary),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AddExpenseScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: RefreshIndicator(
            color: AppColors.primary,
            backgroundColor: AppColors.surface,
            strokeWidth: 2.5,
            onRefresh: () async {
              await expenseProvider.fetchMyExpenses();
              await Provider.of<TravelProvider>(context, listen: false).fetchTravelHistory(limit: 30);
            },
            child: expenseProvider.isLoading ? const SkeletonList()
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: listItems,
                  ),
          ),
        ),
      ),
    );
  }
}
