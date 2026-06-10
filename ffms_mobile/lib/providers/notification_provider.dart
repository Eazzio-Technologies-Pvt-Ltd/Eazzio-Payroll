import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/notification_model.dart';
import '../services/socket_service.dart';
import '../core/utils/notification_helper.dart';

class NotificationProvider extends ChangeNotifier {
  List<NotificationModel> _notifications = [];
  int _unreadCount = 0;
  bool _isLoading = false;

  List<NotificationModel> get notifications => _notifications;
  int get unreadCount => _unreadCount;
  bool get isLoading => _isLoading;

  NotificationProvider() {
    _initSocketListener();
  }

  void _initSocketListener() {
    SocketService.onNewNotification = (data) {
      if (data != null) {
        final newNotif = NotificationModel.fromJson(data as Map<String, dynamic>);
        _notifications.insert(0, newNotif);
        _unreadCount++;
        
        NotificationHelper.showNewNotification(
          newNotif.title, 
          newNotif.message
        );
        
        notifyListeners();
      }
    };
  }

  // Fetch my notifications
  Future<void> fetchNotifications() async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.client.get('/notifications');
      if (response.data['success'] == true) {
        final list = response.data['data']['notifications'] as List? ?? [];
        _notifications = list.map((item) => NotificationModel.fromJson(item as Map<String, dynamic>)).toList();
      }
      await fetchUnreadCount();
    } catch (e) {
      // Catch
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Get unread count
  Future<void> fetchUnreadCount() async {
    try {
      final response = await ApiService.client.get('/notifications/unread-count');
      if (response.data['success'] == true) {
        _unreadCount = response.data['data']['unreadCount'] as int? ?? 0;
      }
    } catch (e) {
      // Catch
    }
    notifyListeners();
  }

  // Mark single read
  Future<void> markAsRead(String notificationId) async {
    try {
      final response = await ApiService.client.put('/notifications/$notificationId/read');
      if (response.data['success'] == true) {
        await fetchNotifications();
      }
    } catch (e) {
      // Catch
    }
  }

  // Mark all read
  Future<void> markAllAsRead() async {
    try {
      final response = await ApiService.client.put('/notifications/read-all');
      if (response.data['success'] == true) {
        await fetchNotifications();
      }
    } catch (e) {
      // Catch
    }
  }
}
