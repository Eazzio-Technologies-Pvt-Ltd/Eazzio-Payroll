// test/services/alarm_service_test.dart

import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:ffms_mobile/services/alarm_service.dart';
import 'package:ffms_mobile/core/utils/storage_helper.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  final List<MethodCall> methodCalls = [];
  bool shouldThrowPlatformException = false;

  setUp(() async {
    methodCalls.clear();
    shouldThrowPlatformException = false;

    SharedPreferences.setMockInitialValues({
      'alarm_punch_in_tone': 'assets/sounds/tone_in.mp3',
      'alarm_punch_out_tone': 'assets/sounds/tone_out.mp3',
    });
    await StorageHelper.initialize();

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('com.eazzio.payroll/alarm_notifications'), (methodCall) async {
      methodCalls.add(methodCall);
      if (shouldThrowPlatformException) {
        throw PlatformException(code: 'ERROR', message: 'Failed operation');
      }
      if (methodCall.method == 'scheduleAlarm') {
        return true;
      }
      return null;
    });
  });

  group('AlarmService Tests', () {
    test('1. snoozeAlarm() cancels the existing alarm before scheduling a new one', () async {
      final success = await AlarmService.snoozeAlarm(isPunchIn: true);

      expect(success, isTrue);

      // We expect:
      // 1. cancelAlarm(isPunchIn: true)
      // 2. stopActiveAlarm()
      // 3. scheduleAlarm
      expect(methodCalls.length, 3);
      expect(methodCalls[0].method, 'cancelAlarm');
      expect(methodCalls[0].arguments, {'isPunchIn': true});
      expect(methodCalls[1].method, 'stopActiveAlarm');
      expect(methodCalls[2].method, 'scheduleAlarm');
    });

    test('2. snoozeAlarm() schedules the new alarm exactly 5 minutes from call time', () async {
      final beforeCall = DateTime.now().add(const Duration(minutes: 5));
      final success = await AlarmService.snoozeAlarm(isPunchIn: false);
      final afterCall = DateTime.now().add(const Duration(minutes: 5));

      expect(success, isTrue);
      
      final scheduleCall = methodCalls.firstWhere((call) => call.method == 'scheduleAlarm');
      final timeInMillis = scheduleCall.arguments['timeInMillis'] as int;
      final alarmTime = DateTime.fromMillisecondsSinceEpoch(timeInMillis);

      // Verify scheduled time is ~5 minutes from now (within 2 seconds tolerance)
      expect(alarmTime.isAfter(beforeCall.subtract(const Duration(seconds: 2))), isTrue);
      expect(alarmTime.isBefore(afterCall.add(const Duration(seconds: 2))), isTrue);
      
      expect(scheduleCall.arguments['isPunchIn'], isFalse);
      expect(scheduleCall.arguments['customTunePath'], 'assets/sounds/tone_out.mp3');
    });

    test('3. cancelAllImmediately() cancels both punch-in and punch-out alarms and stops active sound', () async {
      await AlarmService.cancelAllImmediately();

      expect(methodCalls.length, 3);
      expect(methodCalls[0].method, 'cancelAlarm');
      expect(methodCalls[0].arguments, {'isPunchIn': true});
      
      expect(methodCalls[1].method, 'cancelAlarm');
      expect(methodCalls[1].arguments, {'isPunchIn': false});

      expect(methodCalls[2].method, 'stopActiveAlarm');
    });

    test('4. If platform channel throws PlatformException, snoozeAlarm() returns false rather than crashing', () async {
      shouldThrowPlatformException = true;
      final success = await AlarmService.snoozeAlarm(isPunchIn: true);

      expect(success, isFalse);
    });
  });
}
