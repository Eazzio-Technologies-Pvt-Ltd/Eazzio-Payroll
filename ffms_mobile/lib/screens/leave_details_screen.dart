import 'package:flutter/material.dart';
import '../widgets/skeleton_loader.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/leave_provider.dart';
import '../providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import 'leave_detail_screen.dart';
import 'apply_leave_screen.dart';
import '../widgets/empty_state.dart';

// UI/UX v2 — modern premium design — Antigravity 2026
class LeaveDetailsScreen extends StatefulWidget {
  const LeaveDetailsScreen({super.key});

  @override
  State<LeaveDetailsScreen> createState() => _LeaveDetailsScreenState();
}

class _LeaveDetailsScreenState extends State<LeaveDetailsScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
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
      _refreshData();
    });
  }

  void _refreshData() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userId = authProvider.currentUser?.id;
    final orgId = authProvider.currentUser?.organization?.id;
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
    leaveProvider.fetchMyLeaves(userId: userId, orgId: orgId);
    leaveProvider.fetchBalances();
  }

  Widget _buildSummaryCard(String title, String value, Color badgeColor, Color textColor) {
    return Expanded(
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 4),
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
          border: Border.all(color: AppColors.outlineVariant, width: 1),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                title,
                style: TextStyle(
                  fontFamily: 'Plus Jakarta Sans',
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: textColor,
                ),
              ),
            ),
            const SizedBox(height: 12),
            Text(
              value,
              style: const TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.onSurface,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    switch (status.toUpperCase()) {
      case 'APPROVED':
        bgColor = const Color(0xFFDCFCE7); // Green-100
        textColor = const Color(0xFF15803D); // Green-700
        break;
      case 'REJECTED':
        bgColor = const Color(0xFFFEE2E2); // Red-100
        textColor = const Color(0xFFB91C1C); // Red-700
        break;
      case 'PENDING':
      default:
        bgColor = const Color(0xFFFEF3C7); // Amber-100
        textColor = const Color(0xFFB45309); // Amber-700
        break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        status.toUpperCase(),
        style: TextStyle(
          fontFamily: 'Plus Jakarta Sans',
          color: textColor,
          fontSize: 11,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final leaveProvider = Provider.of<LeaveProvider>(context);

    // Calculate dynamic totals from balances
    int totalEntitlement = 0;
    int totalUsed = 0;
    int totalRemaining = 0;

    for (final balance in leaveProvider.balances) {
      if (balance.leaveType.toUpperCase() == 'UNPAID') {
        continue;
      }
      totalEntitlement += balance.totalEntitled;
      totalUsed += balance.totalUsed;
      totalRemaining += balance.available;
    }

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Leave Details',
          style: TextStyle(
            fontFamily: 'Plus Jakarta Sans',
            fontWeight: FontWeight.bold,
          ),
        ),
        backgroundColor: Colors.white,
        elevation: 0.5,
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: SafeArea(
            child: Column(
          children: [
            // Summary Cards Row
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 16, 12, 16),
              child: Row(
                children: [
                  _buildSummaryCard(
                    'Remaining',
                    '$totalRemaining',
                    const Color(0xFFDCFCE7),
                    const Color(0xFF15803D),
                  ),
                  _buildSummaryCard(
                    'Used',
                    '$totalUsed',
                    const Color(0xFFFEF3C7),
                    const Color(0xFFB45309),
                  ),
                  _buildSummaryCard(
                    'Entitlement',
                    '$totalEntitlement',
                    const Color(0xFFEFF6FF),
                    const Color(0xFF1E3A8A),
                  ),
                ],
              ),
            ),

            // Leaves History list
            Expanded(
              child: RefreshIndicator(
                color: AppColors.primary,
                backgroundColor: AppColors.surface,
                strokeWidth: 2.5,
                onRefresh: () async {
                  _refreshData();
                },
                child: leaveProvider.isLoading ? const SkeletonList()
                    : leaveProvider.leaves.isEmpty
                        ? ListView(
                            physics: const AlwaysScrollableScrollPhysics(),
                            children: const [
                              SizedBox(height: 50),
                              EmptyState(
                                icon: Icons.date_range_outlined,
                                title: "No leave records found",
                                subtitle: "Apply for leaves using the button below.",
                              ),
                            ],
                          )
                        : ListView.builder(
                            physics: const AlwaysScrollableScrollPhysics(),
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            itemCount: leaveProvider.leaves.length,
                            itemBuilder: (context, index) {
                              final leave = leaveProvider.leaves[index];
                              final startStr = DateFormat('dd MMM').format(leave.startDate);
                              final endStr = DateFormat('dd MMM yyyy').format(leave.endDate);

                              return Container(
                                margin: const EdgeInsets.only(bottom: 12),
                                decoration: BoxDecoration(
                                  color: Colors.white,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.outlineVariant, width: 1),
                                ),
                                child: InkWell(
                                  onTap: () {
                                    Navigator.push(
                                      context,
                                      MaterialPageRoute(
                                        builder: (context) => LeaveDetailScreen(leave: leave),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(16),
                                  child: Padding(
                                    padding: const EdgeInsets.all(16.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              leave.leaveType.toUpperCase(),
                                              style: const TextStyle(
                                                fontFamily: 'Plus Jakarta Sans',
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                                color: AppColors.onSurface,
                                              ),
                                            ),
                                            const SizedBox(height: 6),
                                            Text(
                                              '$startStr - $endStr',
                                              style: const TextStyle(
                                                fontFamily: 'Plus Jakarta Sans',
                                                fontSize: 12,
                                                color: AppColors.onSurfaceVariant,
                                              ),
                                            ),
                                          ],
                                        ),
                                        _buildStatusBadge(leave.status),
                                      ],
                                    ),
                                  ),
                                ),
                              );
                            },
                          ),
              ),
            ),

            // Apply Leave button at bottom
            Padding(
              padding: const EdgeInsets.all(16.0),
              child: SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (context) => const ApplyLeaveScreen()),
                    ).then((_) {
                      _refreshData();
                    });
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  child: const Text(
                    'Apply Leave',
                    style: TextStyle(
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    ),
    ),
    );
  }
}
