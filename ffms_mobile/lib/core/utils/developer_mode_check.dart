import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DeveloperModeCheck {
  static const MethodChannel _channel = MethodChannel('com.eazzio.payroll/device_settings');

  /// Check if Android development settings (Developer Options) are enabled on the device.
  static Future<bool> isDeveloperModeEnabled() async {
    try {
      final bool enabled = await _channel.invokeMethod('isDeveloperModeEnabled');
      return enabled;
    } catch (_) {
      return false;
    }
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
    final bool isDevMode = await isDeveloperModeEnabled();
    if (!isDevMode) return false;

    if (!context.mounted) return true;

    await showDialog(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return PopScope(
          canPop: false,
          child: AlertDialog(
            title: const Text('Developer Options Detected'),
            content: const Text(
              'Security guidelines require you to turn off Developer Options to access Eazzio Payroll.\n\n'
              'Please turn off settings or close the app.',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  SystemNavigator.pop();
                },
                child: const Text('Exit App / Do It Later', style: TextStyle(color: Colors.red)),
              ),
              ElevatedButton(
                onPressed: () async {
                  await openDeveloperSettings();
                },
                child: const Text('Turn Off Settings'),
              ),
            ],
          ),
        );
      },
    );
    return true;
  }
}
