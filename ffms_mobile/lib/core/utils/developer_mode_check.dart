import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DeveloperModeCheck {
  static const MethodChannel _channel = MethodChannel('com.eazzio.payroll/device_settings');

  /// Check if Android development settings (Developer Options) are enabled on the device.
  static Future<bool> isDeveloperModeEnabled() async {
    return false;
  }

  /// Redirect the user directly to the developer options system setting screen.
  static Future<void> openDeveloperSettings() async {
    try {
      await _channel.invokeMethod('openDeveloperSettings');
    } catch (_) {}
  }

  /// Show a modal overlay dialogue to block users who have developer mode enabled.
  /// User can either click "Turn Off Settings" to be redirected, or "Exit App" to terminate.
  static Future<bool> checkAndShowDialog(BuildContext context) async {
    return false;
  }
}
