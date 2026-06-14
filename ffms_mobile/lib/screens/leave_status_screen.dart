import 'package:flutter/material.dart';
import '../widgets/skeleton_loader.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/leave_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';
import 'leave_detail_screen.dart';
import '../widgets/empty_state.dart';

// Leave history list screen v2 — modern card items + clean text layouts
class LeaveStatusScreen extends StatefulWidget {
  const LeaveStatusScreen({super.key});

  @override
  State<LeaveStatusScreen> createState() => _LeaveStatusScreenState();
}

class _LeaveStatusScreenState extends State<LeaveStatusScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<LeaveProvider>(context, listen: false).fetchMyLeaves();
    });
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text(
          'Leave History',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        strokeWidth: 2.5,
        onRefresh: () async => leaveProvider.fetchMyLeaves(),
        child: leaveProvider.isLoading ? const SkeletonList()
            : leaveProvider.leaves.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                      const EmptyState(
                        icon: Icons.date_range_outlined,
                        title: "No leave records found",
                        subtitle: "Your leave applications and history will appear here.",
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: leaveProvider.leaves.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final leave = leaveProvider.leaves[index];
                      final startStr = DateFormat('dd MMM yyyy').format(leave.startDate);
                      final endStr = DateFormat('dd MMM yyyy').format(leave.endDate);

                      return Container(
                        decoration: AppTheme.cardDecoration,
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          child: InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (context) => LeaveDetailScreen(leave: leave),
                                ),
                              );
                            },
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        leave.leaveType,
                                        style: GoogleFonts.inter(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      StatusBadge(status: leave.status),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              'Duration',
                                              style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              '$startStr - $endStr',
                                              style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                                color: AppColors.textPrimary,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 12),
                                  if (leave.reason.isNotEmpty) ...[
                                    Text(
                                      'Reason',
                                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      leave.reason,
                                      style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                                    ),
                                  ],
                                  if (leave.approvalNote != null && leave.approvalNote!.isNotEmpty) ...[
                                    const SizedBox(height: 12),
                                    Container(
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(
                                        color: AppColors.primarySoft,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
                                      ),
                                      child: Row(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Icon(Icons.comment, size: 14, color: AppColors.primary),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Text(
                                                  'Admin Remark',
                                                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary),
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  leave.approvalNote!,
                                                  style: GoogleFonts.inter(fontSize: 12, color: AppColors.textPrimary, height: 1.4),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    )
                                  ]
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }
}
