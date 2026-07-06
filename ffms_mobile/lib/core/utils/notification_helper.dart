import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationHelper {
  static final FlutterLocalNotificationsPlugin _notificationsPlugin = FlutterLocalNotificationsPlugin();
  
  static Future<void> initialize() async {
    try {
      const AndroidInitializationSettings initializationSettingsAndroid =
          AndroidInitializationSettings('@mipmap/launcher_icon');

      const InitializationSettings initializationSettings = InitializationSettings(
        android: initializationSettingsAndroid,
      );

      await _notificationsPlugin.initialize(
        initializationSettings,
        onDidReceiveNotificationResponse: (NotificationResponse response) {
          // Handle notification tap
        },
      );
    } catch (e) {
      // Catch initialization errors to avoid blocking application boot
      debugPrint("NotificationHelper initialization error: $e");
    }
  }

  static Future<void> showPeriodicPhotoPrompt() async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'photo_prompt_channel',
      'Photo Prompts',
      channelDescription: 'Periodic prompts to take status photos',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      ticker: 'ticker',
    );
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);
    await _notificationsPlugin.show(
      0,
      'Eazzio Payroll: Action Required',
      'Please open the app to take your 15-minute status photo.',
      platformChannelSpecifics,
      payload: 'photo_prompt',
    );
  }

  static Future<void> showNewNotification(String title, String body) async {
    const AndroidNotificationDetails androidPlatformChannelSpecifics =
        AndroidNotificationDetails(
      'general_notif_channel',
      'General Notifications',
      channelDescription: 'General app alerts and updates',
      importance: Importance.max,
      priority: Priority.high,
    );
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidPlatformChannelSpecifics);
    await _notificationsPlugin.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      platformChannelSpecifics,
    );
  }

  /// Shows a high-priority notification when an auto punch-out is triggered
  /// (9-hour limit rule or midnight daily reset).
  static Future<void> showAutoPunchOutNotification({
    required String title,
    required String body,
  }) async {
    const AndroidNotificationDetails androidDetails = AndroidNotificationDetails(
      'auto_punch_out_channel',
      'Auto Punch-Out Alerts',
      channelDescription: 'Alerts when the system automatically punches you out',
      importance: Importance.max,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      playSound: true,
      ticker: 'auto_punch_out',
      // Makes it a heads-up notification (shows as a banner)
      fullScreenIntent: false,
    );
    const NotificationDetails platformChannelSpecifics =
        NotificationDetails(android: androidDetails);
    await _notificationsPlugin.show(
      99901, // Fixed ID so repeated triggers replace, not stack
      title,
      body,
      platformChannelSpecifics,
    );
  }
}

