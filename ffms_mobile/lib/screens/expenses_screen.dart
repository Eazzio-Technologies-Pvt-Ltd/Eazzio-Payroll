import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/expense_provider.dart';
import '../providers/travel_provider.dart';
import '../widgets/status_badge.dart';
import '../core/theme/app_theme.dart';
import 'add_expense_screen.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});

  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<ExpenseProvider>(context, listen: false).fetchMyExpenses();
      Provider.of<TravelProvider>(context, listen: false).fetchTravelHistory(limit: 30);
    });
  }

  Future<void> _submitDraft(String id) async {
    final expProvider = Provider.of<ExpenseProvider>(context, listen: false);
    final success = await expProvider.submitExpense(id);
    
    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Expense submitted successfully'), backgroundColor: AppColors.secondary),
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
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isBold ? AppColors.onSurface : AppColors.onSurfaceVariant,
            ),
          ),
          Text(
            '$prefix${amount.toStringAsFixed(0)}',
            style: TextStyle(
              fontSize: isBold ? 15 : 13,
              fontWeight: isBold || color != null ? FontWeight.bold : FontWeight.normal,
              color: color ?? (isBold ? AppColors.primary : AppColors.onSurface),
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

    // Group expenses by category client-side from API response
    // Expenses grouped by category client-side from API response
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

    if (expenseProvider.expenses.isEmpty) {
      listItems.add(
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 32.0),
          child: Center(
            child: Text(
              'No expenses filed yet.',
              style: TextStyle(color: AppColors.outline),
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
                Text(
                  category,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: AppColors.outline,
                    letterSpacing: 0.5,
                  ),
                ),
                Text(
                  'Total: ₹${catTotal.toStringAsFixed(0)}',
                  style: const TextStyle(
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
          final dateStr = DateFormat('yyyy-MM-dd').format(expense.date);
          final amountStr = '₹${expense.amount.toStringAsFixed(0)}';
          
          // Submitted to: [Manager Name]
          // Fetch from expense record or user profile
          final managerName = expense.approvedById != null 
              ? 'Manager ID: ${expense.approvedById}' 
              : 'Manager';

          listItems.add(
            Card(
              margin: const EdgeInsets.symmetric(vertical: 6),
              child: Padding(
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
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        StatusBadge(status: expense.status),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '$dateStr | ${expense.description ?? expense.category}',
                          style: const TextStyle(fontSize: 12, color: AppColors.outline),
                        ),
                        Text(
                          amountStr,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Submitted to: $managerName',
                          style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: AppColors.outline),
                        ),
                        if (expense.status == 'DRAFT')
                          TextButton(
                            style: TextButton.styleFrom(
                              minimumSize: Size.zero,
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            ),
                            onPressed: () => _submitDraft(expense.id),
                            child: const Text('Submit Claim', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        }
      });
    }

    // Summary Card
    listItems.add(
      Card(
        color: AppColors.background,
        margin: const EdgeInsets.only(top: 24, bottom: 12),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'EXPENSE SUMMARY',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.outline),
              ),
              const Divider(height: 16),
              _buildSummaryRow('Total Submitted', totalSubmitted),
              _buildSummaryRow('Total Approved', totalApproved, color: const Color(0xFF007230)),
              _buildSummaryRow('Total Pending', totalPending, color: const Color(0xFF8E3C00)),
              _buildSummaryRow('Total Rejected', totalRejected, color: const Color(0xFFBA1A1A)),
            ],
          ),
        ),
      ),
    );

    // Salary Impact Card
    // TODO: Backend API needed — GET /api/v1/payroll/my/breakdown
    // Salary impact card shows how expenses affect net pay
    listItems.add(
      Card(
        color: AppColors.primaryContainer,
        margin: const EdgeInsets.only(top: 12, bottom: 24),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'SALARY IMPACT',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
              ),
              const Divider(height: 16),
              _buildSummaryRow('Approved Expenses', totalApproved, prefix: '+₹'),
              _buildSummaryRow('Travel Allowance', totalTravelAllowance, prefix: '+₹'),
              const Divider(height: 16),
              _buildSummaryRow('Total Addition to Salary', totalApproved + totalTravelAllowance, prefix: '+₹', isBold: true),
            ],
          ),
        ),
      ),
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Expenses', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => const AddExpenseScreen()),
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        // UI/UX v2 — modern premium design — Antigravity 2026
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        strokeWidth: 2.5,
        onRefresh: () async {
          await expenseProvider.fetchMyExpenses();
          await Provider.of<TravelProvider>(context, listen: false).fetchTravelHistory(limit: 30);
        },
        child: expenseProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : ListView(
                padding: const EdgeInsets.all(16),
                children: listItems,
              ),
      ),
    );
  }
}
