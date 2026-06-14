import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../providers/task_provider.dart';
import '../widgets/task_card.dart';
import '../core/theme/app_theme.dart';
import 'task_detail_screen.dart';
import '../widgets/task_skeleton.dart';
import '../widgets/empty_state.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/custom_button.dart';

// Task list screen v2 — clean search input + custom tabs + bottom sheet styling
class TasksScreen extends StatefulWidget {
  const TasksScreen({super.key});

  @override
  State<TasksScreen> createState() => _TasksScreenState();
}

class _TasksScreenState extends State<TasksScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  // Status filter tabs — order: All, In Progress, Pending, Complete, Missed
  final List<Map<String, String>> _tabs = [
    {'label': 'All', 'status': 'ALL'},
    {'label': 'In Progress', 'status': 'IN_PROGRESS'},
    {'label': 'Pending', 'status': 'PENDING'},
    {'label': 'Complete', 'status': 'COMPLETED'},
    {'label': 'Missed', 'status': 'OVERDUE'},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabs.length, vsync: this);
    _tabController.addListener(_handleTabChange);

    // Fetch initial task list and load local personal tasks
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final taskProvider = Provider.of<TaskProvider>(context, listen: false);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      taskProvider.fetchMyTasks();
      // Load any personal tasks saved offline
      final userId = authProvider.currentUser?.id;
      if (userId != null) {
        taskProvider.loadLocalPersonalTasks(userId);
        // Attempt to sync any queued personal tasks
        taskProvider.syncPersonalTasks();
      }
    });
  }

  void _handleTabChange() {
    if (_tabController.indexIsChanging) return;
    _fetchTasksForCurrentTab();
  }

  void _fetchTasksForCurrentTab() {
    final status = _tabs[_tabController.index]['status'];
    Provider.of<TaskProvider>(context, listen: false).fetchMyTasks(status: status);
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _showPersonalTaskSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _PersonalTaskSheet(
        onCreated: () {
          _fetchTasksForCurrentTab();
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final taskProvider = Provider.of<TaskProvider>(context);

    // Apply client-side search query filtering
    final filteredTasks = taskProvider.tasks.where((task) {
      if (_searchQuery.isEmpty) return true;
      return task.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (task.description?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false) ||
          (task.projectName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text(
          'My Tasks',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary),
        ),
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Column(
            children: [
              TabBar(
                controller: _tabController,
                isScrollable: true,
                labelColor: AppColors.primary,
                unselectedLabelColor: AppColors.textSecondary,
                indicatorColor: AppColors.primary,
                indicatorWeight: 3,
                labelStyle: GoogleFonts.inter(fontWeight: FontWeight.w600, fontSize: 13),
                unselectedLabelStyle: GoogleFonts.inter(fontWeight: FontWeight.w500, fontSize: 13),
                tabs: _tabs.map((t) => Tab(text: t['label'])).toList(),
              ),
              Container(color: AppColors.border, height: 1),
            ],
          ),
        ),
      ),
      body: Column(
        children: [
          // Search box
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              onChanged: (val) {
                setState(() => _searchQuery = val);
              },
              style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
              decoration: modernInputDecoration(
                hint: 'Search tasks...',
                prefixIcon: Icons.search,
                suffixIcon: _searchQuery.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18, color: AppColors.textSecondary),
                        onPressed: () {
                          _searchController.clear();
                          setState(() => _searchQuery = '');
                        },
                      )
                    : null,
              ),
            ),
          ),

          // Tasks List — single unified list
          Expanded(
            child: RefreshIndicator(
              color: AppColors.primary,
              backgroundColor: AppColors.surface,
              strokeWidth: 2.5,
              onRefresh: () async => _fetchTasksForCurrentTab(),
              child: taskProvider.isLoading
                  ? ListView.separated(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                      itemCount: 6,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, index) => const TaskSkeletonCard(),
                    )
                  : filteredTasks.isEmpty
                      ? ListView(
                          children: [
                            SizedBox(height: MediaQuery.of(context).size.height * 0.05),
                            const EmptyState(
                              icon: Icons.task_alt_outlined,
                              title: 'No tasks assigned yet',
                              subtitle: 'Check back later or create a personal task using the button below.',
                            ),
                          ],
                        )
                      : ListView.separated(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          itemCount: filteredTasks.length,
                          separatorBuilder: (context, index) => const SizedBox(height: 12),
                          itemBuilder: (context, index) {
                            final task = filteredTasks[index];
                            return TaskCard(
                              task: task,
                              onTap: () {
                                if (task.id.startsWith('local_')) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(
                                      content: Text('This personal task is saved offline. It will sync when you are online.'),
                                    ),
                                  );
                                  return;
                                }
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => TaskDetailScreen(taskId: task.id),
                                  ),
                                );
                              },
                            );
                          },
                        ),
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showPersonalTaskSheet,
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add, color: Colors.white),
        label: Text('Personal Task', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
    );
  }
}

// ─── Personal Task Creation Bottom Sheet ──────────────────────────────────────

class _PersonalTaskSheet extends StatefulWidget {
  final VoidCallback onCreated;

  const _PersonalTaskSheet({required this.onCreated});

  @override
  State<_PersonalTaskSheet> createState() => _PersonalTaskSheetState();
}

class _PersonalTaskSheetState extends State<_PersonalTaskSheet> {
  final _formKey = GlobalKey<FormState>();
  final _titleController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime? _dueDate;
  bool _submitting = false;

  @override
  void dispose() {
    _titleController.dispose();
    _notesController.dispose();
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
      setState(() => _dueDate = date);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final userId = authProvider.currentUser?.id;

    if (userId == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('User session not found. Please re-login.'), backgroundColor: AppColors.error),
        );
      }
      setState(() => _submitting = false);
      return;
    }

    final success = await taskProvider.createPersonalTask(
      title: _titleController.text.trim(),
      notes: _notesController.text.trim(),
      dueDate: _dueDate,
      userId: userId,
    );

    if (mounted) {
      setState(() => _submitting = false);
      if (success) {
        Navigator.pop(context);
        widget.onCreated();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Personal task created!'), backgroundColor: AppColors.success),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(taskProvider.errorMessage ?? 'Failed to create task'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Create Personal Task',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 4),
              Text(
                'This task is private to you and hidden from admin/manager.',
                style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // Title field
              Text(
                'Task Title *',
                style: GoogleFonts.inter(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _titleController,
                style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                decoration: modernInputDecoration(
                  hint: 'What do you need to do?',
                ),
                validator: (val) {
                  if (val == null || val.trim().isEmpty) return 'Title is required';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // Notes field
              Text(
                'Notes (optional)',
                style: GoogleFonts.inter(
                  color: AppColors.textSecondary,
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                style: GoogleFonts.inter(color: AppColors.textPrimary, fontSize: 14),
                decoration: modernInputDecoration(
                  hint: 'Add details...',
                ),
              ),
              const SizedBox(height: 16),

              // Due Date picker
              GestureDetector(
                onTap: _selectDueDate,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  decoration: AppTheme.cardDecoration,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Due Date (optional)',
                            style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _dueDate != null
                                ? DateFormat('dd MMM yyyy').format(_dueDate!)
                                : 'Select date',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: _dueDate != null ? AppColors.textPrimary : AppColors.textTertiary,
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

              // Submit Button
              CustomButton(
                text: 'Create Task',
                onPressed: _submit,
                isLoading: _submitting,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
