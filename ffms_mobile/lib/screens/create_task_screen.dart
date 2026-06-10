import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../providers/auth_provider.dart';
import '../providers/task_provider.dart';
import '../models/user_model.dart';
import '../core/theme/app_theme.dart';
import '../widgets/custom_button.dart';

class CreateTaskScreen extends StatefulWidget {
  const CreateTaskScreen({super.key});

  @override
  State<CreateTaskScreen> createState() => _CreateTaskScreenState();
}

class _CreateTaskScreenState extends State<CreateTaskScreen> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _descController = TextEditingController();
  
  String _priority = 'MEDIUM';
  DateTime? _dueDate;
  
  List<UserModel> _allEmployees = [];
  List<String> _selectedAssigneeIds = [];
  bool _fetchingEmployees = false;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  Future<void> _loadEmployees() async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final userRole = authProvider.currentUser?.role ?? 'FIELD_STAFF';
    
    // Field staff can only assign task to themselves
    if (userRole == 'FIELD_STAFF') {
      final currentUserId = authProvider.currentUser?.id;
      if (currentUserId != null) {
        _selectedAssigneeIds = [currentUserId];
      }
      return;
    }

    setState(() => _fetchingEmployees = true);
    try {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final employees = await taskProvider.fetchAvailableEmployees();
      setState(() {
        _allEmployees = employees;
        // Default to self if in the list, or empty
        final currentUserId = authProvider.currentUser?.id;
        if (currentUserId != null && employees.any((e) => e.id == currentUserId)) {
          _selectedAssigneeIds = [currentUserId];
        }
      });
    } catch (_) {
      // Ignore
    } finally {
      setState(() => _fetchingEmployees = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _descController.dispose();
    super.dispose();
  }

  Future<void> _selectDueDate() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _dueDate ?? now,
      firstDate: now,
      lastDate: now.add(const Duration(days: 365)),
    );
    if (date != null) {
      final time = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(_dueDate ?? now),
      );
      if (time != null) {
        setState(() {
          _dueDate = DateTime(date.year, date.month, date.day, time.hour, time.minute);
        });
      }
    }
  }

  Future<void> _handleSubmit() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedAssigneeIds.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select at least one assignee.'), backgroundColor: AppColors.error),
      );
      return;
    }

    setState(() => _submitting = true);
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    
    final success = await taskProvider.createTask(
      title: _titleController.text.trim(),
      description: _descController.text.trim(),
      priority: _priority,
      dueDate: _dueDate,
      assigneeIds: _selectedAssigneeIds,
    );

    if (mounted) {
      setState(() => _submitting = false);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Task created successfully!'), backgroundColor: AppColors.secondary),
        );
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(taskProvider.errorMessage ?? 'Failed to create task'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final userRole = authProvider.currentUser?.role ?? 'FIELD_STAFF';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Create New Task', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0.5,
      ),
      body: _fetchingEmployees
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  // Title Field
                  TextFormField(
                    controller: _titleController,
                    decoration: const InputDecoration(
                      labelText: 'Task Title',
                      hintText: 'Enter task title...',
                    ),
                    validator: (val) {
                      if (val == null || val.trim().isEmpty) {
                        return 'Title is required';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 16),

                  // Description Field
                  TextFormField(
                    controller: _descController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Description',
                      hintText: 'Enter description (optional)...',
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Priority Selector
                  DropdownButtonFormField<String>(
                    value: _priority,
                    decoration: const InputDecoration(
                      labelText: 'Priority',
                    ),
                    items: const [
                      DropdownMenuItem(value: 'LOW', child: Text('Low')),
                      DropdownMenuItem(value: 'MEDIUM', child: Text('Medium')),
                      DropdownMenuItem(value: 'HIGH', child: Text('High')),
                      DropdownMenuItem(value: 'URGENT', child: Text('Urgent')),
                    ],
                    onChanged: (val) {
                      if (val != null) {
                        setState(() => _priority = val);
                      }
                    },
                  ),
                  const SizedBox(height: 16),

                  // Due Date Picker
                  GestureDetector(
                    onTap: _selectDueDate,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.outlineVariant),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Due Date',
                                style: TextStyle(fontSize: 12, color: AppColors.onSurfaceVariant),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _dueDate != null
                                    ? DateFormat('dd MMM yyyy, hh:mm a').format(_dueDate!)
                                    : 'Select due date & time',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: _dueDate != null ? AppColors.onSurface : AppColors.outline,
                                ),
                              ),
                            ],
                          ),
                          const Icon(Icons.calendar_today_outlined, color: AppColors.primary, size: 20),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Assignee Selection (only for admin/manager)
                  if (userRole != 'FIELD_STAFF') ...[
                    const Text(
                      'Assign To',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.onSurface),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      constraints: const BoxConstraints(maxHeight: 200),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: AppColors.outlineVariant),
                      ),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _allEmployees.length,
                        separatorBuilder: (_, __) => const Divider(height: 1, color: AppColors.outlineVariant),
                        itemBuilder: (context, index) {
                          final emp = _allEmployees[index];
                          final isSelected = _selectedAssigneeIds.contains(emp.id);
                          return CheckboxListTile(
                            title: Text(emp.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
                            subtitle: Text('${emp.role} • ${emp.email}', style: const TextStyle(fontSize: 11, color: AppColors.outline)),
                            value: isSelected,
                            activeColor: AppColors.primary,
                            onChanged: (bool? val) {
                              setState(() {
                                if (val == true) {
                                  _selectedAssigneeIds.add(emp.id);
                                } else {
                                  _selectedAssigneeIds.remove(emp.id);
                                }
                              });
                            },
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 32),
                  ] else ...[
                    // For field staff, confirm it's an "own task"
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.primaryContainer.withOpacity(0.4),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                      ),
                      child: const Row(
                        children: [
                          Icon(Icons.info_outline, color: AppColors.primary, size: 20),
                          SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              'This is an own task. It will be assigned to you automatically.',
                              style: TextStyle(fontSize: 12, color: AppColors.onPrimaryContainer, fontWeight: FontWeight.w500),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],

                  // Submit Button
                  CustomButton(
                    text: 'Create Task',
                    isLoading: _submitting,
                    onPressed: _handleSubmit,
                  ),
                ],
              ),
            ),
    );
  }
}
