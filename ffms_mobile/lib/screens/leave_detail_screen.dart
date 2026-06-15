import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/leave_provider.dart';
import '../models/leave_model.dart';
import '../core/theme/app_theme.dart';
import '../widgets/status_badge.dart';
import '../core/utils/responsive.dart'; // Responsive helper — no hardcoded sizes

// Leave detail view v2 — clean cards + modern details list + updated cancel alert dialog
class LeaveDetailScreen extends StatefulWidget {
  final LeaveModel leave;

  const LeaveDetailScreen({super.key, required this.leave});

  @override
  State<LeaveDetailScreen> createState() => _LeaveDetailScreenState();
}

class _LeaveDetailScreenState extends State<LeaveDetailScreen> with SingleTickerProviderStateMixin {
  bool _isCancelling = false;
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
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

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
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Cancel Leave Request', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        content: Text('Are you sure you want to cancel this leave request? This action cannot be undone.', style: GoogleFonts.inter(fontSize: 13, height: 1.4, color: AppColors.textSecondary)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: Text('No, Keep It', style: GoogleFonts.inter(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => Navigator.pop(ctx, true),
            child: Text('Yes, Cancel Request', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
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
            backgroundColor: AppColors.success,
          ),
        );
        Navigator.pop(context, true);
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
            title: Text('Attachment Preview', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
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
                errorBuilder: (context, error, stackTrace) => Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.error_outline, color: Colors.white, size: 48),
                    const SizedBox(height: 16),
                    Text('Failed to load attachment image.', style: GoogleFonts.inter(color: Colors.white)),
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
    // Uses Responsive helper — no hardcoded sizes
    final r = Responsive(context);
    final startStr = DateFormat('dd MMM yyyy').format(widget.leave.startDate);
    final endStr = DateFormat('dd MMM yyyy').format(widget.leave.endDate);
    final appliedStr = DateFormat('dd MMM yyyy, hh:mm a').format(widget.leave.createdAt);
    final isPending = widget.leave.status.toUpperCase() == 'PENDING';

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text('Leave Details', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: SingleChildScrollView(
            child: Padding(
          padding: EdgeInsets.all(r.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Summary Card
              Container(
                decoration: AppTheme.cardDecoration,
                padding: EdgeInsets.all(r.cardPadding),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: EdgeInsets.all(r.spaceSM),
                          decoration: const BoxDecoration(
                            color: AppColors.primarySoft,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            _getLeaveTypeIcon(widget.leave.leaveType),
                            color: AppColors.primary,
                            size: r.iconSizeLG,
                          ),
                        ),
                        SizedBox(width: r.spaceMD),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                widget.leave.leaveType,
                                style: GoogleFonts.inter(
                                  fontSize: r.fontXL,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              SizedBox(height: r.spaceXS),
                              Text(
                                '${widget.leave.totalDays} Day(s) Request',
                                style: GoogleFonts.inter(
                                  fontSize: r.fontSM,
                                  color: AppColors.textSecondary,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ],
                          ),
                        ),
                        StatusBadge(status: widget.leave.status, fontSize: r.fontSM),
                      ],
                    ),
                    Divider(height: r.spaceXL),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        _buildDetailCol('Start Date', startStr),
                        Icon(Icons.arrow_forward, color: AppColors.textTertiary, size: r.iconSizeSM),
                        _buildDetailCol('End Date', endStr),
                      ],
                    ),
                  ],
                ),
              ),
              SizedBox(height: r.spaceMD),

              // Specifications
              Container(
                decoration: AppTheme.cardDecoration,
                padding: EdgeInsets.all(r.cardPadding),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Application Info',
                      style: GoogleFonts.inter(
                        fontSize: r.fontMD,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Divider(height: r.spaceLG),
                    _buildRowInfo('Date Applied', appliedStr),
                    if (widget.leave.approvedById != null || widget.leave.managerName != null) ...[
                      SizedBox(height: r.spaceSM),
                      // Displays manager name — not raw managerId
                      // Falls back to 'Manager' if name unavailable
                      _buildRowInfo(
                        'Approved By',
                        widget.leave.managerName ?? 'Manager',
                      ),
                    ],
                  ],
                ),
              ),
              SizedBox(height: r.spaceMD),

              // Reason
              Container(
                decoration: AppTheme.cardDecoration,
                padding: EdgeInsets.all(r.cardPadding),
                width: double.infinity,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Reason for Leave',
                      style: GoogleFonts.inter(
                        fontSize: r.fontMD,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Divider(height: r.spaceMD),
                    Text(
                      widget.leave.reason.isNotEmpty 
                          ? widget.leave.reason 
                          : 'No reason details provided.',
                      style: GoogleFonts.inter(
                        fontSize: r.fontSM,
                        color: AppColors.textSecondary,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              SizedBox(height: r.spaceMD),

              // Admin Remark
              if (widget.leave.approvalNote != null && widget.leave.approvalNote!.isNotEmpty) ...[
                Container(
                  decoration: AppTheme.cardDecoration.copyWith(
                    color: AppColors.primarySoft,
                    border: Border.all(color: AppColors.primary.withOpacity(0.1)),
                  ),
                  width: double.infinity,
                  padding: EdgeInsets.all(r.cardPadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.comment_outlined, size: r.iconSizeSM, color: AppColors.primary),
                          SizedBox(width: r.spaceSM),
                          Text(
                            'Manager Remark',
                            style: GoogleFonts.inter(
                              fontSize: r.fontMD,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      Divider(height: r.spaceMD),
                      Text(
                        widget.leave.approvalNote!,
                        style: GoogleFonts.inter(
                          fontSize: r.fontSM,
                          color: AppColors.textPrimary,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: r.spaceMD),
              ],

              // Attachment
              if (widget.leave.attachmentUrl != null && widget.leave.attachmentUrl!.isNotEmpty) ...[
                Container(
                  decoration: AppTheme.cardDecoration,
                  padding: EdgeInsets.all(r.cardPadding),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Attachment / Medical Proof',
                        style: GoogleFonts.inter(
                          fontSize: r.fontMD,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Divider(height: r.spaceMD),
                      GestureDetector(
                        onTap: () => _viewAttachmentFullScreen(widget.leave.attachmentUrl!),
                        child: Stack(
                          alignment: Alignment.bottomRight,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(12),
                              child: Image.network(
                                widget.leave.attachmentUrl!,
                                height: r.width * 0.5,
                                width: double.infinity,
                                fit: BoxFit.cover,
                                loadingBuilder: (context, child, progress) {
                                  if (progress == null) return child;
                                  return Container(
                                    height: r.width * 0.5,
                                    color: AppColors.bgInput,
                                    child: const Center(child: CircularProgressIndicator()),
                                  );
                                },
                                errorBuilder: (context, error, stackTrace) => Container(
                                  height: r.width * 0.5,
                                  width: double.infinity,
                                  color: AppColors.border,
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.broken_image_outlined, color: AppColors.textSecondary, size: r.iconSizeLG),
                                      SizedBox(height: r.spaceSM),
                                      Text('Could not load attachment image', style: GoogleFonts.inter(color: AppColors.textTertiary, fontSize: r.fontXS)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Container(
                              margin: EdgeInsets.all(r.spaceSM),
                              padding: EdgeInsets.all(r.spaceSM),
                              decoration: BoxDecoration(
                                color: Colors.black.withOpacity(0.6),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(Icons.fullscreen, color: Colors.white, size: r.iconSizeSM),
                            )
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                SizedBox(height: r.spaceMD),
              ],

              // Actions (Cancel Button)
              if (isPending) ...[
                SizedBox(height: r.spaceMD),
                SizedBox(
                  width: double.infinity,
                  height: r.width * 0.14,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.errorContainer,
                      foregroundColor: AppColors.error,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                        side: const BorderSide(color: AppColors.error, width: 1),
                      ),
                    ),
                    icon: _isCancelling 
                        ? const SizedBox(
                            width: 18, 
                            height: 18, 
                            child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.error),
                          )
                        : const Icon(Icons.cancel_outlined),
                    label: Text(
                      'Cancel Leave Request',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: r.fontMD),
                    ),
                    onPressed: _isCancelling ? null : _cancelLeaveRequest,
                  ),
                ),
                SizedBox(height: r.spaceLG),
              ],
            ],
          ),
        ),
      ),
    ),
    ),
    );
  }

  Widget _buildDetailCol(String title, String value) {
    final r = Responsive(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: GoogleFonts.inter(fontSize: r.fontXS, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
        ),
        SizedBox(height: r.spaceXS),
        Text(
          value,
          style: GoogleFonts.inter(fontSize: r.fontMD, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
        ),
      ],
    );
  }

  Widget _buildRowInfo(String label, String val) {
    final r = Responsive(context);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(fontSize: r.fontSM, color: AppColors.textSecondary),
        ),
        Text(
          val,
          style: GoogleFonts.inter(fontSize: r.fontSM, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
      ],
    );
  }
}
