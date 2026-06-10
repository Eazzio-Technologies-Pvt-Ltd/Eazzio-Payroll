import 'package:flutter/material.dart';
import '../core/theme/app_theme.dart';

class LeavePolicyScreen extends StatelessWidget {
  const LeavePolicyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Policy', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _buildPolicyHeader(context),
          const SizedBox(height: 20),
          _buildEligibilitySection(context),
          const SizedBox(height: 16),
          _buildAccrualSection(context),
          const SizedBox(height: 16),
          _buildApprovalSection(context),
          const SizedBox(height: 16),
          _buildImportantNotesSection(context),
        ],
      ),
    );
  }

  Widget _buildPolicyHeader(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1D4ED8), Color(0xFF2563EB)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.policy_outlined, color: Colors.white, size: 32),
          const SizedBox(height: 12),
          const Text(
            'Employee Leave Policy',
            style: TextStyle(
              color: Colors.white,
              fontSize: 20,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            'Updated: June 2025 · Effective for all field staff',
            style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildEligibilitySection(BuildContext context) {
    return _buildSection(
      context,
      icon: Icons.person_outline,
      title: 'Eligibility',
      color: const Color(0xFF7C3AED),
      children: [
        _buildPolicyRow(
          'First 3 Months (Probation)',
          'No leaves allowed during the first 3 months.',
          Icons.block_outlined,
          AppColors.error,
        ),
        _buildPolicyRow(
          'Months 4 to 6',
          '0.5 leave per month allowed.',
          Icons.timelapse_outlined,
          const Color(0xFFF59E0B),
        ),
        _buildPolicyRow(
          'Months 7 to 12',
          '0.5 leave per month allowed.',
          Icons.trending_up_outlined,
          const Color(0xFF3B82F6),
        ),
        _buildPolicyRow(
          'After 12 Months',
          '1 leave per month allowed (Credits on 1st of each month).',
          Icons.check_circle_outline,
          AppColors.secondary,
        ),
      ],
    );
  }

  Widget _buildAccrualSection(BuildContext context) {
    return _buildSection(
      context,
      icon: Icons.calendar_month_outlined,
      title: 'Leave Accrual Rules',
      color: const Color(0xFF059669),
      children: [
        _buildPolicyRow(
          'Monthly Credit',
          'Leaves are credited on the 1st of each month automatically',
          Icons.event_repeat_outlined,
          AppColors.secondary,
        ),
        _buildPolicyRow(
          'Carry Forward',
          'Unused leaves carry forward up to a maximum of 15 days per year',
          Icons.arrow_forward_outlined,
          const Color(0xFF3B82F6),
        ),
        _buildPolicyRow(
          'Encashment',
          'Leaves beyond 15 days lapse at the end of the year — no encashment allowed',
          Icons.money_off_outlined,
          AppColors.error,
        ),
        _buildPolicyRow(
          'Leave Types Available',
          'Sick Leave, Casual Leave, Earned Leave, Unpaid Leave, Other',
          Icons.list_alt_outlined,
          const Color(0xFF7C3AED),
        ),
      ],
    );
  }

  Widget _buildApprovalSection(BuildContext context) {
    return _buildSection(
      context,
      icon: Icons.approval_outlined,
      title: 'Approval Process',
      color: const Color(0xFF0891B2),
      children: [
        _buildPolicyRow(
          'Application',
          'Apply at least 1 day in advance for planned leaves. Emergency leaves can be applied on the same day.',
          Icons.send_outlined,
          const Color(0xFF3B82F6),
        ),
        _buildPolicyRow(
          'Approval Timeline',
          'Manager reviews and approves/rejects within 24 hours of application',
          Icons.timer_outlined,
          const Color(0xFFF59E0B),
        ),
        _buildPolicyRow(
          'Required Documents',
          'Sick Leave (≥3 days): Medical certificate required. Other leaves: No documents needed.',
          Icons.description_outlined,
          AppColors.secondary,
        ),
        _buildPolicyRow(
          'Rejection Appeals',
          'Contact HR at hr@company.com for appeal. Decision is final after 48 hours.',
          Icons.help_outline,
          AppColors.outline,
        ),
      ],
    );
  }

  Widget _buildImportantNotesSection(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF3C7),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.warning_amber_outlined, color: Color(0xFFF59E0B)),
              SizedBox(width: 8),
              Text(
                'Important Notes',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Color(0xFF92400E),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          _buildNote('Consecutive absences without approved leave are treated as LOP (Loss of Pay).'),
          _buildNote('Leaves taken on public holidays are counted separately and do not consume your leave balance.'),
          _buildNote('Abandonment (3+ consecutive unauthorized absences) may lead to disciplinary action.'),
          _buildNote('Salary impact: Each leave day deducts 1/26th of your monthly base salary.'),
        ],
      ),
    );
  }

  Widget _buildSection(
    BuildContext context, {
    required IconData icon,
    required String title,
    required Color color,
    required List<Widget> children,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          ...children,
        ],
      ),
    );
  }

  Widget _buildPolicyRow(String title, String description, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Padding(
            padding: const EdgeInsets.only(left: 24),
            child: Text(
              description,
              style: const TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant, height: 1.5),
            ),
          ),
          const SizedBox(height: 8),
          const Divider(height: 1),
        ],
      ),
    );
  }

  Widget _buildNote(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Icon(Icons.circle, size: 6, color: Color(0xFFF59E0B)),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                fontSize: 12,
                color: Color(0xFF78350F),
                height: 1.5,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
