import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter/material.dart';

class AlarmService {
  static const MethodChannel _channel = MethodChannel('com.eazzio.payroll/alarm_notifications');

  // Shared preferences keys
  static const String prefPunchInTime = 'alarm_punch_in_time';
  static const String prefPunchOutTime = 'alarm_punch_out_time';
  static const String prefPunchInEnabled = 'alarm_punch_in_enabled';
  static const String prefPunchOutEnabled = 'alarm_punch_out_enabled';
  static const String prefPunchInTone = 'alarm_punch_in_tone';
  static const String prefPunchOutTone = 'alarm_punch_out_tone';

  /// Check if notification policy access (Do Not Disturb bypass) is granted
  static Future<bool> isDndAccessGranted() async {
    try {
      return await _channel.invokeMethod<bool>('isDndAccessGranted') ?? true;
    } on PlatformException catch (e) {
      debugPrint('Error checking DND access: $e');
      return true;
    }
  }

  /// Request Do Not Disturb access settings screen
  static Future<bool> requestDndAccess() async {
    try {
      return await _channel.invokeMethod<bool>('requestDndAccess') ?? false;
    } on PlatformException catch (e) {
      debugPrint('Error requesting DND access: $e');
      return false;
    }
  }

  /// Check if app is ignored from battery optimizations
  static Future<bool> isBatteryOptimizationIgnored() async {
    try {
      return await _channel.invokeMethod<bool>('isBatteryOptimizationIgnored') ?? true;
    } on PlatformException catch (e) {
      debugPrint('Error checking battery optimization: $e');
      return true;
    }
  }

  /// Launch native file picker to select a custom alarm tone and copy to app storage
  static Future<String?> pickCustomTone() async {
    try {
      return await _channel.invokeMethod<String>('pickAudioFile');
    } on PlatformException catch (e) {
      debugPrint('Error picking audio file: $e');
      return null;
    }
  }

  /// Stops any currently playing alarm (called when user successfully punches in/out)
  static Future<bool> stopActiveAlarm() async {
    try {
      return await _channel.invokeMethod<bool>('stopActiveAlarm') ?? false;
    } on PlatformException catch (e) {
      debugPrint('Error stopping active alarm: $e');
      return false;
    }
  }

  /// Cancel scheduled alarm for punch-in or punch-out
  static Future<bool> cancelAlarm(bool isPunchIn) async {
    try {
      return await _channel.invokeMethod<bool>('cancelAlarm', {'isPunchIn': isPunchIn}) ?? false;
    } on PlatformException catch (e) {
      debugPrint('Error cancelling alarm: $e');
      return false;
    }
  }

  /// Schedule alarm for punch-in or punch-out
  static Future<bool> scheduleAlarm({
    required TimeOfDay time,
    required bool isPunchIn,
    required String? customTunePath,
  }) async {
    try {
      final now = DateTime.now();
      var alarmDateTime = DateTime(now.year, now.month, now.day, time.hour, time.minute);

      // If the alarm time has already passed today, schedule it for tomorrow
      if (alarmDateTime.isBefore(now)) {
        alarmDateTime = alarmDateTime.add(const Duration(days: 1));
      }

      final success = await _channel.invokeMethod<bool>('scheduleAlarm', {
        'timeInMillis': alarmDateTime.millisecondsSinceEpoch,
        'isPunchIn': isPunchIn,
        'customTunePath': customTunePath,
      });

      debugPrint('Scheduled alarm for ${alarmDateTime.toString()} (isPunchIn=$isPunchIn, success=$success)');
      return success ?? false;
    } on PlatformException catch (e) {
      debugPrint('Error scheduling alarm: $e');
      return false;
    }
  }

  /// Snooze an alarm: cancel the current alarm and reschedule it 5 minutes from now.
  /// Called when the user taps the Snooze action on a punch notification.
  static Future<bool> snoozeAlarm({required bool isPunchIn}) async {
    try {
      // Cancel the currently ringing or scheduled alarm for this event
      await cancelAlarm(isPunchIn);
      await stopActiveAlarm();

      // Schedule a new alarm 5 minutes from now
      final snoozeTime = DateTime.now().add(const Duration(minutes: 5));

      final prefs = await SharedPreferences.getInstance();
      final customTone = isPunchIn
          ? prefs.getString(prefPunchInTone)
          : prefs.getString(prefPunchOutTone);

      final success = await _channel.invokeMethod<bool>('scheduleAlarm', {
        'timeInMillis': snoozeTime.millisecondsSinceEpoch,
        'isPunchIn': isPunchIn,
        'customTunePath': customTone,
      });

      debugPrint('[AlarmService] Snooze scheduled for $snoozeTime (isPunchIn=$isPunchIn, success=$success)');
      return success ?? false;
    } on PlatformException catch (e) {
      debugPrint('[AlarmService] Error snoozing alarm: $e');
      return false;
    }
  }

  /// Cancel ALL alarms immediately — called as soon as attendance action is completed.
  /// Rule: Once punch-in or punch-out succeeds, ALL related alarms MUST be cancelled immediately.
  static Future<void> cancelAllImmediately() async {
    await cancelAlarm(true);   // cancel punch-in alarm
    await cancelAlarm(false);  // cancel punch-out alarm
    await stopActiveAlarm();   // stop any currently ringing alarm
    debugPrint('[AlarmService] All alarms cancelled immediately after successful punch action.');
  }

  /// Synchronize/schedule alarms based on stored preferences and active user shift
  static Future<void> syncAlarms(String? shiftStartTime, String? shiftEndTime) async {
    final prefs = await SharedPreferences.getInstance();

    // Auto-update alarm times to match shift timings if not manually set
    if (shiftStartTime != null && prefs.getString(prefPunchInTime) == null) {
      await prefs.setString(prefPunchInTime, shiftStartTime);
    }
    if (shiftEndTime != null && prefs.getString(prefPunchOutTime) == null) {
      await prefs.setString(prefPunchOutTime, shiftEndTime);
    }

    final punchInTimeStr = prefs.getString(prefPunchInTime) ?? shiftStartTime ?? '09:00';
    final punchOutTimeStr = prefs.getString(prefPunchOutTime) ?? shiftEndTime ?? '18:00';

    final punchInEnabled = prefs.getBool(prefPunchInEnabled) ?? true;
    final punchOutEnabled = prefs.getBool(prefPunchOutEnabled) ?? true;

    final punchInTone = prefs.getString(prefPunchInTone);
    final punchOutTone = prefs.getString(prefPunchOutTone);

    // Schedule or cancel punch-in alarm
    if (punchInEnabled) {
      final time = _parseTimeString(punchInTimeStr);
      await scheduleAlarm(time: time, isPunchIn: true, customTunePath: punchInTone);
    } else {
      await cancelAlarm(true);
    }

    // Schedule or cancel punch-out alarm
    if (punchOutEnabled) {
      final time = _parseTimeString(punchOutTimeStr);
      await scheduleAlarm(time: time, isPunchIn: false, customTunePath: punchOutTone);
    } else {
      await cancelAlarm(false);
    }
  }

  /// Cancel all alarms (e.g. on logout)
  static Future<void> cancelAll() async {
    await cancelAlarm(true);
    await cancelAlarm(false);
    await stopActiveAlarm();
  }

  // Helper to parse "HH:mm" time string to TimeOfDay
  static TimeOfDay _parseTimeString(String timeStr) {
    try {
      final parts = timeStr.split(':');
      return TimeOfDay(hour: int.parse(parts[0]), minute: int.parse(parts[1]));
    } catch (_) {
      return const TimeOfDay(hour: 9, minute: 0);
    }
  }
}
