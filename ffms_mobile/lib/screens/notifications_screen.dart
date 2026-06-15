import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/notification_provider.dart';
import '../providers/leave_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/empty_state.dart';
import '../models/notification_model.dart';
import '../models/leave_model.dart';
import 'task_detail_screen.dart';
import 'leave_detail_screen.dart';
import '../widgets/staggered_list_item.dart';
import '../providers/expense_provider.dart';
import 'expense_detail_screen.dart';

// UI/UX v2 — modern premium design — Antigravity 2026
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  @override
  void initState() {
    super.initState();
    // Entrance animation — fade + slide from bottom
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
      Provider.of<NotificationProvider>(context, listen: false).fetchNotifications();
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

    Future<void> _handleNotificationTap(NotificationModel item) async {
    final notifProvider = Provider.of<NotificationProvider>(context, listen: false);
    
    // Mark as read silently under the hood instantly
    if (!item.isRead) {
      notifProvider.markAsReadSilent(item.id);
    }
    
    // Routes notification tap to correct detail screen based on notification type field
    final type = item.type?.toUpperCase() ?? '';
    final refId = item.referenceId;
    
    if (type == 'TASK' && refId.isNotEmpty) {
      Navigator.push(
        context,
        PageRouteBuilder(
          pageBuilder: (_, animation, __) => TaskDetailScreen(taskId: refId),
          transitionsBuilder: (_, animation, __, child) => SlideTransition(
            position: Tween<Offset>(begin: const Offset(1.0, 0), end: Offset.zero).animate(
              CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
            ),
            child: child,
          ),
          transitionDuration: const Duration(milliseconds: 300),
        ),
      );
    } else if (type == 'LEAVE' && refId.isNotEmpty) {
      final leaveProvider = Provider.of<LeaveProvider>(context, listen: false);
      LeaveModel? existingLeave;
      for (final l in leaveProvider.leaves) {
        if (l.id == refId) {
          existingLeave = l;
          break;
        }
      }
      
      if (existingLeave != null) {
        // Instant redirect if already loaded locally using slide transition
        Navigator.push(
          context,
          PageRouteBuilder(
            pageBuilder: (_, animation, __) => LeaveDetailScreen(leave: existingLeave!),
            transitionsBuilder: (_, animation, __, child) => SlideTransition(
              position: Tween<Offset>(begin: const Offset(1.0, 0), end: Offset.zero).animate(
                CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
              ),
              child: child,
            ),
            transitionDuration: const Duration(milliseconds: 300),
          ),
        );
      } else {
        // Show loading spinner only while fetching from network
        showDialog(
          context: context,
          barrierDismissible: false,
          builder: (context) => const Center(
            child: CircularProgressIndicator(color: AppColors.primary),
          ),
        );
        
        try {
          await leaveProvider.fetchMyLeaves();
          if (mounted) {
            Navigator.pop(context); // Close loading indicator
            
            LeaveModel? fetchedLeave;
            for (final l in leaveProvider.leaves) {
              if (l.id == refId) {
                fetchedLeave = l;
                break;
              }
            }
            
            if (fetchedLeave != null) {
              Navigator.push(
                context,
                PageRouteBuilder(
                  pageBuilder: (_, animation, __) => LeaveDetailScreen(leave: fetchedLeave!),
                  transitionsBuilder: (_, animation, __, child) => SlideTransition(
                    position: Tween<Offset>(begin: const Offset(1.0, 0), end: Offset.zero).animate(
                      CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
                    ),
                    child: child,
                  ),
                  transitionDuration: const Duration(milliseconds: 300),
                ),
              );
            } else {
              throw Exception('Leave not found');
            }
          }
        } catch (e) {
          if (mounted) {
            Navigator.pop(context); // Close loading dialog if open
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Could not open leave details: ${e.toString()}'),
                backgroundColor: AppColors.error,
              ),
            );
          }
        }
      }
    } else if (type == 'EXPENSE' && refId.isNotEmpty) {
      // Show loading spinner while fetching expense details
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );
      
      try {
        final expenseProvider = Provider.of<ExpenseProvider>(context, listen: false);
        final expense = await expenseProvider.getExpenseById(refId);
        if (mounted) {
          Navigator.pop(context); // Close loading dialog
          if (expense != null) {
            Navigator.push(
              context,
              PageRouteBuilder(
                pageBuilder: (_, animation, __) => ExpenseDetailScreen(expense: expense),
                transitionsBuilder: (_, animation, __, child) => SlideTransition(
                  position: Tween<Offset>(begin: const Offset(1.0, 0), end: Offset.zero).animate(
                    CurvedAnimation(parent: animation, curve: Curves.easeOutCubic),
                  ),
                  child: child,
                ),
                transitionDuration: const Duration(milliseconds: 300),
              ),
            );
          } else {
            throw Exception('Expense not found');
          }
        }
      } catch (e) {
        if (mounted) {
          Navigator.pop(context); // Close loading dialog if open
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Could not open expense details: ${e.toString()}'),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } else {
      // Fallback
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('No details available')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final notifProvider = Provider.of<NotificationProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        actions: [
          if (notifProvider.unreadCount > 0)
            TextButton(
              onPressed: () => notifProvider.markAllAsRead(),
              child: const Text('Mark all read'),
            ),
          const SizedBox(width: 8),
        ],
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        strokeWidth: 2.5,
        onRefresh: () async => notifProvider.fetchNotifications(),
        child: notifProvider.isLoading
            ? const _NotificationSkeletonList()
            : notifProvider.notifications.isEmpty
                ? ListView(
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.15),
                      const EmptyState(
                        icon: Icons.done_all_outlined,
                        title: "You're all caught up!",
                        subtitle: "No new notifications at this time. We will let you know when something comes up.",
                      ),
                    ],
                  )
                : ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifProvider.notifications.length,
                    separatorBuilder: (context, index) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final item = notifProvider.notifications[index];
                      final timeStr = DateFormat('dd MMM, hh:mm a').format(item.createdAt.toLocal());
                      return StaggeredListItem(
                        index: index,
                        child: Card(
                          color: item.isRead ? AppColors.surface : AppColors.primaryContainer.withOpacity(0.04),
                          child: InkWell(
                          onTap: () => _handleNotificationTap(item),
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Icon(
                                  item.type == 'GEOFENCE'
                                      ? Icons.location_on_outlined
                                      : item.type == 'TASK'
                                          ? Icons.assignment_outlined
                                          : Icons.notifications_active_outlined,
                                  color: item.isRead ? AppColors.outline : AppColors.primary,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Expanded(
                                            child: Text(
                                              item.title,
                                              style: TextStyle(
                                                fontWeight: item.isRead ? FontWeight.w600 : FontWeight.bold,
                                                fontSize: 14,
                                                color: AppColors.onSurface,
                                              ),
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          if (!item.isRead)
                                            Container(
                                              width: 8,
                                              height: 8,
                                              decoration: const BoxDecoration(
                                                color: AppColors.primary,
                                                shape: BoxShape.circle,
                                              ),
                                            ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        item.message,
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: item.isRead ? AppColors.onSurfaceVariant : AppColors.onSurface,
                                        ),
                                      ),
                                      const SizedBox(height: 8),
                                      Text(
                                        timeStr,
                                        style: const TextStyle(fontSize: 11, color: AppColors.outline),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
          ),
        ),
      ),
    );
  }
}


class _NotificationSkeletonList extends StatelessWidget {
  const _NotificationSkeletonList();

  @override
  Widget build(BuildContext context) {
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        return Shimmer.fromColors(
          baseColor: Colors.grey[200]!,
          highlightColor: Colors.grey[100]!,
          child: Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
              side: BorderSide(color: Colors.grey[200]!),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: 24,
                    height: 24,
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 140,
                          height: 14,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          height: 12,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          width: 180,
                          height: 12,
                          color: Colors.white,
                        ),
                        const SizedBox(height: 12),
                        Container(
                          width: 80,
                          height: 10,
                          color: Colors.white,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
