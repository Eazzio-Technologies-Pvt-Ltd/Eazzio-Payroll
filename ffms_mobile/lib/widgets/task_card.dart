import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/task_model.dart';
import '../widgets/status_badge.dart';
import '../core/theme/app_theme.dart';

/// Task card widget with unified label logic:
/// - is_personal == true → show badge: Personal Task
/// - Assigned by manager/admin → show: Assigned by [assigned_by_name]
class TaskCard extends StatelessWidget {
  final TaskModel task;
  final VoidCallback onTap;

  const TaskCard({
    super.key,
    required this.task,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color indicatorColor;
    switch (task.priority.toUpperCase()) {
      case 'HIGH':
      case 'URGENT':
        indicatorColor = AppColors.error;
        break;
      case 'MEDIUM':
        indicatorColor = AppColors.tertiary;
        break;
      case 'LOW':
      default:
        indicatorColor = AppColors.primary;
    }

    // Find the user assignment to get the current assignment status
    final String status = task.assignments.isNotEmpty
        ? task.assignments.first.status
        : task.status;

    // Task label display logic:
    // is_personal == true → badge: Personal Task
    // Assigned by manager/admin → Assigned by [name]
    final bool isLocalTask = task.id.startsWith('local_');

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Stack(
            children: [
              Positioned(
                left: 0,
                top: 0,
                bottom: 0,
                width: 4,
                child: Container(color: indicatorColor),
              ),
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            task.title,
                            style: Theme.of(context).textTheme.headlineSmall,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 8),
                        StatusBadge(status: status),
                      ],
                    ),

                    // Personal Task badge or Assigned By label
                    const SizedBox(height: 8),
                    if (task.isPersonal || isLocalTask) ...[
                      // Personal task badge display
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: const Color(0xFF7C3AED).withAlpha(25),
                          borderRadius: BorderRadius.circular(999),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.person, size: 12, color: Color(0xFF7C3AED)),
                            const SizedBox(width: 4),
                            Text(
                              isLocalTask ? 'Personal Task (Offline)' : 'Personal Task',
                              style: const TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w600,
                                color: Color(0xFF7C3AED),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 6),
                    ],
                    if (task.projectName != null) ...[
                      Row(
                        children: [
                          const Icon(Icons.folder_open, size: 16, color: AppColors.outline),
                          const SizedBox(width: 8),
                          Text(
                            task.projectName!,
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                    ],
                    Row(
                      children: [
                        const Icon(Icons.location_on_outlined, size: 16, color: AppColors.outline),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            task.territoryName ?? 'No Location',
                            style: Theme.of(context).textTheme.bodyMedium,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        const Icon(Icons.calendar_today_outlined, size: 16, color: AppColors.outline),
                        const SizedBox(width: 8),
                        Text(
                          task.dueDate != null
                              ? DateFormat('dd MMM yyyy, hh:mm a').format(task.dueDate!.toLocal())
                              : 'No Due Date',
                          style: Theme.of(context).textTheme.bodyMedium,
                        ),
                      ],
                    ),
                    // Assigned By label — show only for non-personal tasks
                    if (task.createdBy != null && !task.isPersonal && !isLocalTask) ...[
                      const SizedBox(height: 8),
                      const Divider(height: 1, color: AppColors.outlineVariant),
                      const SizedBox(height: 8),
                      Row(
                        children: [
                          const Icon(Icons.person_pin_outlined, size: 14, color: AppColors.outline),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Assigned By: ${task.createdBy!.name} (${task.createdBy!.displayRole})',
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.outline,
                                fontWeight: FontWeight.w500,
                              ),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
