import 'package:flutter/material.dart';
import '../widgets/skeleton_loader.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/task_provider.dart';
import '../models/task_model.dart';
import '../widgets/status_badge.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../core/theme/app_theme.dart';
import 'submit_report_screen.dart';

import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../utils/image_upload_util.dart';

// Task detail screen v2 — clean cards + updated comments section + modern image selectors
class TaskDetailScreen extends StatefulWidget {
  final String taskId;

  const TaskDetailScreen({super.key, required this.taskId});

  @override
  State<TaskDetailScreen> createState() => _TaskDetailScreenState();
}

class _TaskDetailScreenState extends State<TaskDetailScreen> {
  final TextEditingController _commentController = TextEditingController();
  List<CommentModel> _comments = [];
  bool _isLoadingComments = false;
  bool _isLoadingTask = false;
  bool _isActionInProgress = false;

  @override
  void initState() {
    super.initState();
    _loadTask();
    _loadComments();
  }

  Future<void> _loadTask() async {
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final exists = taskProvider.tasks.any((t) => t.id == widget.taskId);
    if (!exists) {
      setState(() => _isLoadingTask = true);
      await taskProvider.fetchTaskById(widget.taskId);
      if (mounted) {
        setState(() => _isLoadingTask = false);
      }
    }
  }

  Future<void> _loadComments() async {
    setState(() => _isLoadingComments = true);
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final list = await taskProvider.getComments(widget.taskId);
    setState(() {
      _comments = list;
      _isLoadingComments = false;
    });
  }

  Future<void> _handleStatusUpdate(String assignmentId, String newStatus, {String? completionNote, List<String>? completionImages}) async {
    setState(() => _isActionInProgress = true);
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final success = await taskProvider.updateAssignmentStatus(widget.taskId, assignmentId, newStatus, completionNote: completionNote, completionImages: completionImages);
    setState(() => _isActionInProgress = false);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Task status updated to ${newStatus.replaceAll('_', ' ')}'), backgroundColor: AppColors.success),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(taskProvider.errorMessage ?? 'Failed to update status'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _submitComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Please enter a comment before sending.'), backgroundColor: AppColors.error),
        );
      }
      return;
    }

    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final success = await taskProvider.addComment(widget.taskId, text);

    if (success) {
      _commentController.clear();
      _loadComments();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment sent successfully!'), backgroundColor: AppColors.success),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to send comment. Please try again.'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _showCompletionDialog(String assignmentId) async {
    final noteController = TextEditingController();
    String? base64TaskImage;
    String? base64SelfieImage;
    bool isPicking = false;
    
    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setState) {
            return AlertDialog(
              backgroundColor: AppColors.surface,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Text(
                'Complete Task',
                style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: noteController,
                      maxLines: 3,
                      style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                      decoration: modernInputDecoration(
                        hint: 'Describe what was completed...',
                      ).copyWith(
                        labelText: 'Completion Note *',
                        errorText: noteController.text.trim().isEmpty && base64TaskImage != null
                            ? 'Completion note is required'
                            : null,
                      ),
                      onChanged: (_) => setState(() {}),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        // Task Proof column
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (base64TaskImage != null)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    base64Decode(base64TaskImage!.contains(',') ? base64TaskImage!.split(',').last : base64TaskImage!),
                                    height: 60,
                                    width: 60,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              else
                                const Icon(Icons.image, size: 40, color: AppColors.textTertiary),
                              const SizedBox(height: 4),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: base64TaskImage != null ? AppColors.successSoft : AppColors.primarySoft,
                                  foregroundColor: base64TaskImage != null ? AppColors.success : AppColors.primary,
                                  minimumSize: const Size(80, 32),
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                ),
                                icon: const Icon(Icons.camera_alt, size: 12),
                                label: Text('Task Proof', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold)),
                                onPressed: isPicking ? null : () async {
                                  setState(() => isPicking = true);
                                  try {
                                    final result = await ImageUploadUtil.pickAndCompressImage(
                                      context,
                                      cameraOnly: false,
                                      preferredCameraDevice: CameraDevice.rear,
                                    );
                                    if (result != null) {
                                      setState(() => base64TaskImage = result.base64String);
                                    }
                                  } finally {
                                    setState(() => isPicking = false);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 8),
                        // Selfie column
                        Expanded(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              if (base64SelfieImage != null)
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.memory(
                                    base64Decode(base64SelfieImage!.contains(',') ? base64SelfieImage!.split(',').last : base64SelfieImage!),
                                    height: 60,
                                    width: 60,
                                    fit: BoxFit.cover,
                                  ),
                                )
                              else
                                const Icon(Icons.face, size: 40, color: AppColors.textTertiary),
                              const SizedBox(height: 4),
                              ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: base64SelfieImage != null ? AppColors.successSoft : AppColors.primarySoft,
                                  foregroundColor: base64SelfieImage != null ? AppColors.success : AppColors.primary,
                                  minimumSize: const Size(80, 32),
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                ),
                                icon: const Icon(Icons.camera_front, size: 12),
                                label: Text('Selfie', style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.bold)),
                                onPressed: isPicking ? null : () async {
                                  setState(() => isPicking = true);
                                  try {
                                    final result = await ImageUploadUtil.pickAndCompressImage(
                                      context,
                                      cameraOnly: true,
                                      preferredCameraDevice: CameraDevice.front,
                                    );
                                    if (result != null) {
                                      setState(() => base64SelfieImage = result.base64String);
                                    }
                                  } finally {
                                    setState(() => isPicking = false);
                                  }
                                },
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    if (noteController.text.trim().isEmpty || base64TaskImage == null || base64SelfieImage == null)
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: AppColors.errorContainer,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (noteController.text.trim().isEmpty)
                              Text('• Completion note is required', style: GoogleFonts.inter(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                            if (base64TaskImage == null)
                              Text('• Task Proof photo is required', style: GoogleFonts.inter(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                            if (base64SelfieImage == null)
                              Text('• Selfie verification is required', style: GoogleFonts.inter(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: Text('Cancel', style: GoogleFonts.inter(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(80, 36),
                  ),
                  onPressed: (noteController.text.trim().isEmpty ||
                          base64TaskImage == null ||
                          base64SelfieImage == null)
                      ? null
                      : () => Navigator.pop(ctx, true),
                  child: Text('Submit', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    ).then((submit) {
      if (submit == true) {
        _handleStatusUpdate(
          assignmentId, 
          'COMPLETED',
          completionNote: noteController.text.trim().isNotEmpty ? noteController.text.trim() : null,
          completionImages: [base64TaskImage!, base64SelfieImage!],
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final taskProvider = Provider.of<TaskProvider>(context);
    
    final task = taskProvider.tasks.firstWhere(
      (t) => t.id == widget.taskId,
      orElse: () => TaskModel(
        id: '',
        title: 'Task Not Found',
        priority: 'LOW',
        status: 'PENDING',
        createdAt: DateTime.now(),
        assignments: [],
      ),
    );

    if (task.id.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text('Loading Task...', style: GoogleFonts.inter(fontWeight: FontWeight.bold))),
        body: _isLoadingTask
            ? const SkeletonDetails()
            : Center(
                child: Text('Task not found.', style: GoogleFonts.inter(color: AppColors.textSecondary)),
              ),
      );
    }

    final assignment = task.assignments.isNotEmpty ? task.assignments.first : null;
    final assignmentStatus = assignment?.status ?? task.status;

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text('Task Detail', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary)),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Task info Card
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.all(16),
              width: double.infinity,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      StatusBadge(status: task.priority),
                      StatusBadge(status: assignmentStatus),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    task.title,
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  if (task.description != null && task.description!.isNotEmpty) ...[
                    Text(
                      task.description!,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],
                  const Divider(height: 24),
                  
                  // Metadata block
                  _buildDetailRow(context, Icons.folder_open, 'Project', task.projectName ?? 'No Project'),
                  const SizedBox(height: 12),
                  _buildDetailRow(context, Icons.location_on_outlined, 'Territory', task.territoryName ?? 'No Territory'),
                  if (task.createdBy != null) ...[
                    const SizedBox(height: 12),
                    _buildDetailRow(
                      context,
                      Icons.person_pin_outlined,
                      'Assigned By',
                      '${task.createdBy!.name} (${task.createdBy!.displayRole})',
                    ),
                  ],
                  const SizedBox(height: 12),
                  _buildDetailRow(
                    context,
                    Icons.calendar_today_outlined,
                    'Due Date',
                    task.dueDate != null ? DateFormat('dd MMM yyyy, hh:mm a').format(task.dueDate!.toLocal()) : 'No Due Date',
                  ),
                ],
              ),
            ),
            
            // Action Buttons
            if (assignment != null) ...[
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    if (assignmentStatus == 'PENDING' || assignmentStatus == 'ASSIGNED')
                      CustomButton(
                        text: 'Start Task',
                        isLoading: _isActionInProgress,
                        onPressed: () => _handleStatusUpdate(assignment.id, 'IN_PROGRESS'),
                      ),
                    if (assignmentStatus == 'IN_PROGRESS') ...[
                      CustomButton(
                        text: 'Complete Task',
                        isLoading: _isActionInProgress,
                        onPressed: () => _showCompletionDialog(assignment.id),
                      ),
                      const SizedBox(height: 12),
                      Container(
                        width: double.infinity,
                        height: 52,
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(color: AppColors.primary, width: 1.5),
                        ),
                        child: ElevatedButton(
                          onPressed: () {
                            Navigator.push(
                              context,
                              MaterialPageRoute(
                                builder: (context) => SubmitReportScreen(assignmentId: assignment.id),
                              ),
                            );
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            disabledBackgroundColor: Colors.transparent,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                            ),
                          ),
                          child: Text(
                            'Submit Visit Report',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w600,
                              color: AppColors.primary,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ],

            // Comments section header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: Text(
                'Comments & Updates',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
            ),

            // Comments input box
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                      decoration: modernInputDecoration(
                        hint: 'Add a comment...',
                      ).copyWith(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: AppColors.primary),
                    onPressed: _submitComment,
                  ),
                ],
              ),
            ),

            // Comments List
            if (_isLoadingComments)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(24.0),
                  child: CircularProgressIndicator(),
                ),
              )
            else if (_comments.isEmpty)
              Padding(
                padding: const EdgeInsets.all(32.0),
                child: Center(
                  child: Text(
                    'No comments yet.',
                    style: GoogleFonts.inter(color: AppColors.textTertiary, fontSize: 13),
                  ),
                ),
              )
            else
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _comments.length,
                itemBuilder: (context, index) {
                  final comment = _comments[index];
                  final timeStr = DateFormat('dd MMM, hh:mm a').format(comment.createdAt.toLocal());
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    decoration: const BoxDecoration(
                      color: AppColors.surface,
                      border: Border(bottom: BorderSide(color: AppColors.border, width: 0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              comment.userName,
                              style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                            ),
                            Text(
                              timeStr,
                              style: GoogleFonts.inter(color: AppColors.textTertiary, fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          comment.content,
                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary, height: 1.4),
                        ),
                      ],
                    ),
                  );
                },
              ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.textSecondary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary, fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 2),
              Text(
                value,
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
