import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/task_provider.dart';
import '../models/task_model.dart';
import '../widgets/status_badge.dart';
import '../widgets/custom_button.dart';
import '../core/theme/app_theme.dart';
import 'submit_report_screen.dart';

import 'dart:convert';
import 'package:image_picker/image_picker.dart';
import '../utils/image_upload_util.dart';

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
          SnackBar(content: Text('Task status updated to ${newStatus.replaceAll('_', ' ')}'), backgroundColor: AppColors.secondary),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(taskProvider.errorMessage ?? 'Failed to update status'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  // Send button wired to task message API
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
      // Clear input field on success
      _commentController.clear();
      _loadComments();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Comment sent successfully!'), backgroundColor: AppColors.secondary),
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
              title: const Text('Complete Task'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: noteController,
                      decoration: InputDecoration(
                        labelText: 'Completion Note *',
                        hintText: 'Describe what was completed...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        errorText: noteController.text.trim().isEmpty && base64TaskImage != null
                            ? 'Completion note is required'
                            : null,
                      ),
                      maxLines: 3,
                      onChanged: (_) => setState(() {}), // rebuild to update error
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                      children: [
                        Column(
                          children: [
                            if (base64TaskImage != null)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.memory(base64Decode(base64TaskImage!), height: 60, width: 60, fit: BoxFit.cover),
                              )
                            else
                              const Icon(Icons.image, size: 40, color: Colors.grey),
                            const SizedBox(height: 4),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(80, 36),
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                              ),
                              icon: const Icon(Icons.camera_alt, size: 14),
                              label: const Text('Task Proof', style: TextStyle(fontSize: 10)),
                              onPressed: isPicking ? null : () async {
                                setState(() => isPicking = true);
                                try {
                                  // Reusable image upload utility: checks camera/gallery permission, lets user choose, formats/sizes under 1MB
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
                        Column(
                          children: [
                            if (base64SelfieImage != null)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.memory(base64Decode(base64SelfieImage!), height: 60, width: 60, fit: BoxFit.cover),
                              )
                            else
                              const Icon(Icons.face, size: 40, color: Colors.grey),
                            const SizedBox(height: 4),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                minimumSize: const Size(80, 36),
                                padding: const EdgeInsets.symmetric(horizontal: 8),
                              ),
                              icon: const Icon(Icons.camera_front, size: 14),
                              label: const Text('Selfie', style: TextStyle(fontSize: 10)),
                              onPressed: isPicking ? null : () async {
                                setState(() => isPicking = true);
                                try {
                                  // Reusable image upload utility: checks camera permission, formats/sizes selfie under 1MB
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
                      ],
                    ),
                    const SizedBox(height: 12),
                    // Mandatory fields validation notice
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
                              const Text('• Completion note is required', style: TextStyle(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                            if (base64TaskImage == null)
                              const Text('• Task Proof photo is required', style: TextStyle(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                            if (base64SelfieImage == null)
                              const Text('• Selfie verification is required', style: TextStyle(color: AppColors.error, fontSize: 11, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    minimumSize: const Size(80, 36),
                  ),
                  // Submit disabled unless ALL mandatory fields are filled
                  onPressed: (noteController.text.trim().isEmpty ||
                          base64TaskImage == null ||
                          base64SelfieImage == null)
                      ? null
                      : () => Navigator.pop(ctx, true),
                  child: const Text('Submit'),
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
    
    // Find task from local list
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
        appBar: AppBar(title: const Text('Loading Task...')),
        body: Center(
          child: _isLoadingTask
              ? const CircularProgressIndicator()
              : const Text('Task not found.'),
        ),
      );
    }

    final assignment = task.assignments.isNotEmpty ? task.assignments.first : null;
    final assignmentStatus = assignment?.status ?? task.status;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Task Detail', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
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
                  Text(task.title, style: Theme.of(context).textTheme.headlineLarge),
                  const SizedBox(height: 8),
                  if (task.description != null && task.description!.isNotEmpty) ...[
                    Text(
                      task.description!,
                      style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: AppColors.onSurfaceVariant),
                    ),
                    const SizedBox(height: 16),
                  ],
                  const Divider(),
                  const SizedBox(height: 8),
                  
                  // Metadata grid
                  _buildDetailRow(context, Icons.folder_open, 'Project', task.projectName ?? 'No Project'),
                  const SizedBox(height: 8),
                  _buildDetailRow(context, Icons.location_on_outlined, 'Territory', task.territoryName ?? 'No Territory'),
                  if (task.createdBy != null) ...[
                    const SizedBox(height: 8),
                    _buildDetailRow(
                      context,
                      Icons.person_pin_outlined,
                      'Assigned By',
                      '${task.createdBy!.name} (${task.createdBy!.displayRole})',
                    ),
                  ],
                  const SizedBox(height: 8),
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
                        backgroundColor: AppColors.primary,
                      ),
                    if (assignmentStatus == 'IN_PROGRESS') ...[
                      CustomButton(
                        text: 'Complete Task',
                        isLoading: _isActionInProgress,
                        onPressed: () => _showCompletionDialog(assignment.id),
                        backgroundColor: AppColors.secondary,
                      ),
                      const SizedBox(height: 12),
                      CustomButton(
                        text: 'Submit Visit Report',
                        onPressed: () {
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (context) => SubmitReportScreen(assignmentId: assignment.id),
                            ),
                          );
                        },
                        backgroundColor: AppColors.surface,
                        textColor: AppColors.primary,
                      ),
                    ],
                  ],
                ),
              ),
            ],

            // Comments section header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Text(
                'Comments & Updates',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
            ),

            // Comments input box
            Container(
              color: AppColors.surface,
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _commentController,
                      decoration: InputDecoration(
                        hintText: 'Add a comment...',
                        filled: true,
                        fillColor: AppColors.background,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide.none,
                        ),
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
              const Center(child: Padding(
                padding: EdgeInsets.all(16.0),
                child: CircularProgressIndicator(),
              ))
            else if (_comments.isEmpty)
              const Padding(
                padding: EdgeInsets.all(24.0),
                child: Center(
                  child: Text('No comments yet.', style: TextStyle(color: AppColors.outline)),
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
                      border: Border(bottom: BorderSide(color: AppColors.outlineVariant, width: 0.5)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              comment.userName,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                            ),
                            Text(
                              timeStr,
                              style: const TextStyle(color: AppColors.outline, fontSize: 11),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Text(comment.content, style: const TextStyle(fontSize: 13)),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(BuildContext context, IconData icon, String label, String value) {
    return Row(
      children: [
        Icon(icon, size: 20, color: AppColors.outline),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w500),
            ),
            const SizedBox(height: 2),
            Text(
              value,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.onSurface),
            ),
          ],
        ),
      ],
    );
  }
}
