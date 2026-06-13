// UI/UX v2 — modern premium design — Antigravity 2026
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/attendance_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/app_toast.dart';
import '../core/theme/app_theme.dart';

// Advance pay backend endpoint not yet available
// UI ready — waiting for backend implementation

class RequestAdvanceScreen extends StatefulWidget {
  const RequestAdvanceScreen({super.key});

  @override
  State<RequestAdvanceScreen> createState() => _RequestAdvanceScreenState();
}

class _RequestAdvanceScreenState extends State<RequestAdvanceScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _reasonController = TextEditingController();

  @override
  void dispose() {
    _amountController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authUser = Provider.of<AuthProvider>(context).currentUser;
    final baseSalary = authUser?.baseSalary ?? 0.0;
    final logs = Provider.of<AttendanceProvider>(context).attendanceHistory;

    // Calculate dynamic earned salary components (standard 26 working days)
    final dailySalaryRate = baseSalary / 26.0;

    // Group sessions by date to prevent duplicate rows
    // LATE status treated as full day pay per business rules
    final Map<String, List<dynamic>> groupedByDate = {};
    for (final log in logs) {
      final dateStr = DateFormat('yyyy-MM-dd').format(log.date);
      groupedByDate.putIfAbsent(dateStr, () => []).add(log);
    }

    int getStatusRank(String status) {
      final upper = status.toUpperCase();
      if (upper == 'PRESENT' || upper == 'ON_DUTY') return 4;
      if (upper == 'LATE') return 3;
      if (upper == 'HALF_DAY') return 2;
      if (upper == 'ABSENT') return 1;
      return 0;
    }

    double earnedSalary = 0.0;
    for (final dateLogs in groupedByDate.values) {
      dynamic highestLog = dateLogs.first;
      int highestRank = getStatusRank(highestLog.status);
      for (final log in dateLogs) {
        final rank = getStatusRank(log.status);
        if (rank > highestRank) {
          highestRank = rank;
          highestLog = log;
        }
      }

      final finalStatus = highestLog.status.toUpperCase();
      double salaryFactor = 0.0;
      if (finalStatus == 'PRESENT' || finalStatus == 'ON_DUTY' || finalStatus == 'LATE') {
        salaryFactor = 1.0;
      } else if (finalStatus == 'HALF_DAY') {
        salaryFactor = 0.5;
      }

      earnedSalary += dailySalaryRate * salaryFactor;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Request Salary Advance',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        elevation: 0,
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.onSurface,
        centerTitle: false,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary card of current earned salary with premium gradient
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF070425), Color(0xFF1B0F85)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.15),
                      blurRadius: 20,
                      spreadRadius: 2,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'EARNED SALARY SO FAR (THIS MONTH)',
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '₹${earnedSalary.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 34,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Calculated based on base monthly salary: ₹${baseSalary.toStringAsFixed(0)}',
                      style: const TextStyle(
                        color: Colors.white60,
                        fontSize: 11,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Form fields card container
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.03),
                      blurRadius: 20,
                      spreadRadius: 2,
                      offset: const Offset(0, 8),
                    ),
                  ],
                  border: Border.all(color: AppColors.outlineVariant, width: 1),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Request Details',
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: AppColors.onSurface,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _amountController,
                      label: 'Advance Amount (₹)',
                      hint: 'Enter requested amount',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      prefixIcon: Icons.currency_rupee_rounded,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter an amount';
                        }
                        final requestedAmount = double.tryParse(value.trim());
                        if (requestedAmount == null || requestedAmount <= 0) {
                          return 'Please enter a valid amount';
                        }
                        if (requestedAmount > earnedSalary) {
                          return 'Advance cannot exceed your earned salary of ₹${earnedSalary.toStringAsFixed(2)}';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 16),
                    CustomTextField(
                      controller: _reasonController,
                      label: 'Reason for Advance',
                      hint: 'E.g., Medical emergency, Family expenses',
                      prefixIcon: Icons.notes_rounded,
                      maxLines: 3,
                      validator: (value) {
                        if (value == null || value.trim().isEmpty) {
                          return 'Please enter a reason for the advance';
                        }
                        return null;
                      },
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              CustomButton(
                text: 'Submit Advance Request',
                icon: Icons.send_rounded,
                onPressed: () {
                  if (!_formKey.currentState!.validate()) return;

                  // TODO: Backend API needed — POST /api/v1/advance/request
                  // Payload: { amount: X, reason: string }
                  // Show message to user: "Advance request feature coming soon"
                  // Do not call any API until backend is ready
                  AppToast.showInfo(context, 'Advance request feature coming soon');
                  Navigator.pop(context);
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
