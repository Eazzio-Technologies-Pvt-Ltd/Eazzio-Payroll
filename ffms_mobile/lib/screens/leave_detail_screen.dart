import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/leave_provider.dart';
import '../models/leave_model.dart';
import '../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';

class LeaveDetailScreen extends StatefulWidget {
  final LeaveModel leave;

  const LeaveDetailScreen({super.key, required this.leave});

  @override
  State<LeaveDetailScreen> createState() => _LeaveDetailScreenState();
}

class _LeaveDetailScreenState extends State<LeaveDetailScreen> {
  bool _isCancelling = false;

  IconData _getLeaveTypeIcon(String type) {
    switch (type.toUpperCase()) {
      case 'SICK':
        return Icons.sick_outlined;
      case 'CASUAL':
        return Icons.beach_access_outlined;
      case 'PLANNED':
      case 'EARNED':
        return Icons.event_outlined;
      case 'MATERNITY':
      case 'PATERNITY':
        return Icons.child_care_outlined;
      default:
        return Icons.time_to_leave_outlined;
    }
  }

  Future<void> _cancelLeaveRequest() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Leave Request', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to cancel this leave request? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('No, Keep It'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Yes, Cancel Request'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isCancelling = true);
    final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
    final success = await leaveProvider.cancelLeave(widget.leave.id);
    setState(() => _isCancelling = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Leave request cancelled successfully.'),
            backgroundColor: AppColors.secondary,
          ),
        );
        Navigator.pop(context, true); // Return true to indicate status updated
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(leaveProvider.errorMessage ?? 'Failed to cancel leave request.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    }
  }

  void _viewAttachmentFullScreen(String url) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => Scaffold(
          appBar: AppBar(
            title: const Text('Attachment Preview'),
            backgroundColor: Colors.black,
            foregroundColor: Colors.white,
          ),
          backgroundColor: Colors.black,
          body: Center(
            child: InteractiveViewer(
              child: Image.network(
                url,
                loadingBuilder: (context, child, progress) {
                  if (progress == null) return child;
                  return const Center(child: CircularProgressIndicator(color: Colors.white));
                },
                errorBuilder: (context, error, stackTrace) => const Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.error_outline, color: Colors.white, size: 48),
                    SizedBox(height: 16),
                    Text('Failed to load attachment image.', style: TextStyle(color: Colors.white)),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final startStr = DateFormat('dd MMM yyyy').format(widget.leave.startDate);
    final endStr = DateFormat('dd MMM yyyy').format(widget.leave.endDate);
    final appliedStr = DateFormat('dd MMM yyyy, hh:mm a').format(widget.leave.createdAt);
    final isPending = widget.leave.status.toUpperCase() == 'PENDING';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Leave Details', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: AppColors.primaryContainer.withOpacity(0.1),
                              shape: BoxShape.circle,
                            ),
                            child: Icon(
                              _getLeaveTypeIcon(widget.leave.leaveType),
                              color: AppColors.primary,
                              size: 28,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  widget.leave.leaveType,
                                  style: const TextStyle(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  '${widget.leave.totalDays} Day(s) Request',
                                  style: const TextStyle(
                                    fontSize: 13,
                                    color: AppColors.outline,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          StatusBadge(status: widget.leave.status, fontSize: 12),
                        ],
                      ),
                      const Divider(height: 32),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildDetailCol('Start Date', startStr),
                          const Icon(Icons.arrow_forward, color: AppColors.outline, size: 16),
                          _buildDetailCol('End Date', endStr),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Specifications
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Application Info',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const Divider(height: 24),
                      _buildRowInfo('Date Applied', appliedStr),
                      if (widget.leave.approvedById != null) ...[
                        const SizedBox(height: 12),
                        _buildRowInfo('Manager ID', widget.leave.approvedById!),
                      ],
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Reason
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Reason for Leave',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: AppColors.onSurface,
                        ),
                      ),
                      const Divider(height: 16),
                      Text(
                        widget.leave.reason.isNotEmpty 
                            ? widget.leave.reason 
                            : 'No reason details provided.',
                        style: const TextStyle(
                          fontSize: 13,
                          color: AppColors.onSurfaceVariant,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Admin Remark
              if (widget.leave.approvalNote != null && widget.leave.approvalNote!.isNotEmpty) ...[
                Card(
                  color: AppColors.primaryContainer.withOpacity(0.08),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.comment_outlined, size: 18, color: AppColors.primary),
                            SizedBox(width: 8),
                            Text(
                              'Manager Remark',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primary,
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 16),
                        Text(
                          widget.leave.approvalNote!,
                          style: const TextStyle(
                            fontSize: 13,
                            color: AppColors.onPrimaryContainer,
                            height: 1.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Attachment
              if (widget.leave.attachmentUrl != null && widget.leave.attachmentUrl!.isNotEmpty) ...[
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Attachment / Medical Proof',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.onSurface,
                          ),
                        ),
                        const Divider(height: 16),
                        GestureDetector(
                          onTap: () => _viewAttachmentFullScreen(widget.leave.attachmentUrl!),
                          child: Stack(
                            alignment: Alignment.bottomRight,
                            children: [
                              ClipRRect(
                                borderRadius: BorderRadius.circular(12),
                                child: Image.network(
                                  widget.leave.attachmentUrl!,
                                  height: 180,
                                  width: double.infinity,
                                  fit: BoxFit.cover,
                                  loadingBuilder: (context, child, progress) {
                                    if (progress == null) return child;
                                    return Container(
                                      height: 180,
                                      color: AppColors.background,
                                      child: const Center(child: CircularProgressIndicator()),
                                    );
                                  },
                                  errorBuilder: (context, error, stackTrace) => Container(
                                    height: 180,
                                    width: double.infinity,
                                    color: AppColors.outlineVariant.withOpacity(0.3),
                                    child: const Column(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(Icons.broken_image_outlined, color: AppColors.outline, size: 40),
                                        SizedBox(height: 8),
                                        Text('Could not load attachment image', style: TextStyle(color: AppColors.outline, fontSize: 12)),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              Container(
                                margin: const EdgeInsets.all(8),
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.black.withOpacity(0.6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.fullscreen, color: Colors.white, size: 20),
                              )
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
              ],

              // Actions (Cancel Button)
              if (isPending) ...[
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.errorContainer,
                      foregroundColor: AppColors.onErrorContainer,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                    ),
                    icon: _isCancelling 
                        ? const SizedBox(
                            width: 18, 
                            height: 18, 
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.onErrorContainer),
                          )
                        : const Icon(Icons.cancel_outlined),
                    label: const Text(
                      'Cancel Leave Request',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    onPressed: _isCancelling ? null : _cancelLeaveRequest,
                  ),
                ),
                const SizedBox(height: 24),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailCol(String title, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w500),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.onSurface),
        ),
      ],
    );
  }

  Widget _buildRowInfo(String label, String val) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 13, color: AppColors.onSurfaceVariant),
        ),
        Text(
          val,
          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.onSurface),
        ),
      ],
    );
  }
}
