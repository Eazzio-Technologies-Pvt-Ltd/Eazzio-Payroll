import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/leave_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';
import 'leave_detail_screen.dart';

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
      appBar: AppBar(
        title: const Text('Leave History', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: RefreshIndicator(
        onRefresh: () async => leaveProvider.fetchMyLeaves(),
        child: leaveProvider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : leaveProvider.leaves.isEmpty
                ? ListView(
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                      const Center(
                        child: Text(
                          'No leave requests found.',
                          style: TextStyle(color: AppColors.outline),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: leaveProvider.leaves.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final leave = leaveProvider.leaves[index];
                      final startStr = DateFormat('dd MMM yyyy').format(leave.startDate);
                      final endStr = DateFormat('dd MMM yyyy').format(leave.endDate);

                      return Card(
                        clipBehavior: Clip.antiAlias,
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
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
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
                                        const Text(
                                          'Duration',
                                          style: TextStyle(fontSize: 11, color: AppColors.outline),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '$startStr - $endStr',
                                          style: const TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.onSurface,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 12),
                              if (leave.reason.isNotEmpty) ...[
                                const Text(
                                  'Reason',
                                  style: TextStyle(fontSize: 11, color: AppColors.outline),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  leave.reason,
                                  style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
                                ),
                              ],
                              if (leave.approvalNote != null && leave.approvalNote!.isNotEmpty) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: AppColors.primaryContainer.withOpacity(0.3),
                                    borderRadius: BorderRadius.circular(8),
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
                                            const Text('Admin Remark', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.primary)),
                                            const SizedBox(height: 2),
                                            Text(
                                              leave.approvalNote!,
                                              style: const TextStyle(fontSize: 12, color: AppColors.onPrimaryContainer),
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
                      );
                    },
                  ),
      ),
    );
  }
}
