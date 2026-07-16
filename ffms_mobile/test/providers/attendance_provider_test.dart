// test/providers/attendance_provider_test.dart
//
// NOTE: StorageHelper has static methods that initialize SharedPreferences.
// We use SharedPreferences.setMockInitialValues() to seed the storage states in tests.

import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:geolocator/geolocator.dart';
import 'package:dio/dio.dart';
import 'package:flutter/services.dart';
import 'package:ffms_mobile/providers/attendance_provider.dart';
import 'package:ffms_mobile/models/attendance_model.dart';
import 'package:ffms_mobile/core/utils/storage_helper.dart';
import 'package:ffms_mobile/services/api_service.dart';

class MockHttpClientAdapter implements HttpClientAdapter {
  dynamic Function(RequestOptions options)? handler;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    if (handler != null) {
      final res = handler!(options);
      if (res is Future) {
        return await res;
      }
      return res as ResponseBody;
    }
    return ResponseBody.fromString('{"success":true,"data":[]}', 200, headers: {
      Headers.contentTypeHeader: [Headers.jsonContentType],
    });
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  late AttendanceProvider provider;
  late MockHttpClientAdapter mockAdapter;

  // Mock User Profile shift: 09:00 to 17:00 (8 hours = 480 minutes)
  const shiftProfileJson = '{"userId":"user123","shift":{"startTime":"09:00","endTime":"17:00"}}';

  Position dummyPosition() {
    return Position(
      latitude: 12.9716,
      longitude: 77.5946,
      timestamp: DateTime.now(),
      accuracy: 10.0,
      altitude: 900.0,
      heading: 0.0,
      speed: 0.0,
      speedAccuracy: 0.0,
      altitudeAccuracy: 0.0,
      headingAccuracy: 0.0,
    );
  }

  setUp(() async {
    SharedPreferences.setMockInitialValues({
      'user_profile_json': shiftProfileJson,
      'user_id': 'user123',
    });
    await StorageHelper.initialize();
    await ApiService.initialize();

    mockAdapter = MockHttpClientAdapter();
    ApiService.client.httpClientAdapter = mockAdapter;

    // Set up method channel mocks to prevent platform exception failures
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('com.eazzio.payroll/alarm_notifications'), (methodCall) async {
      return true;
    });

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('flutter.baseflow.com/geolocator'), (methodCall) async {
      if (methodCall.method == 'isLocationServiceEnabled') return true;
      if (methodCall.method == 'checkPermission') return 3; // whileInUse
      if (methodCall.method == 'requestPermission') return 3;
      return null;
    });

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('com.pravera.flutter_foreground_task/methods'), (methodCall) async {
      return true;
    });

    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(const MethodChannel('plugins.flutter.io/shared_preferences'), (methodCall) async {
      return null;
    });

    provider = AttendanceProvider();
  });

  group('isDayComplete tests', () {
    test('1. Returns false when sessions list is empty', () {
      expect(provider.isDayComplete, isFalse);
    });

    test('2. Returns false when isCurrentlyPunchedIn is true (still mid-session)', () async {
      SharedPreferences.setMockInitialValues({
        'user_profile_json': shiftProfileJson,
        'punch_in_active': true,
        'punch_in_time': DateTime.now().toIso8601String(),
        'user_id': 'user123',
      });
      await StorageHelper.initialize();
      provider = AttendanceProvider();
      expect(provider.isCurrentlyPunchedIn, isTrue);
      expect(provider.isDayComplete, isFalse);
    });

    test('3. Returns false when a session exists but has no punchOutTime (open session)', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 5)).toIso8601String(),
                  'checkOutTime': null,
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isFalse);
    });

    test('4. Returns false when totalWorkedMinutes < shiftDurationMinutes', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 5)).toIso8601String(), // 5 hours worked = 300 min
                  'checkOutTime': now.toIso8601String(),
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isFalse);
    });

    test('5. Returns true when totalWorkedMinutes == shiftDurationMinutes exactly', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 8)).toIso8601String(), // exactly 8 hours
                  'checkOutTime': now.toIso8601String(),
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isTrue);
    });

    test('6. Returns true when totalWorkedMinutes > shiftDurationMinutes', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 9)).toIso8601String(), // 9 hours
                  'checkOutTime': now.toIso8601String(),
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isTrue);
    });

    test('7. Returns true across MULTIPLE completed sessions whose sum crosses shift duration', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 8)).toIso8601String(),
                  'checkOutTime': now.subtract(const Duration(hours: 3)).toIso8601String(), // worked 5h
                  'status': 'PRESENT',
                },
                {
                  'id': '2',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 2,
                  'checkInTime': now.subtract(const Duration(hours: 3)).toIso8601String(),
                  'checkOutTime': now.toIso8601String(), // worked 3h
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isTrue);
    });

    test('8. Returns false across multiple completed sessions whose sum is still under shift duration', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 6)).toIso8601String(),
                  'checkOutTime': now.subtract(const Duration(hours: 3)).toIso8601String(), // worked 3h
                  'status': 'PRESENT',
                },
                {
                  'id': '2',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 2,
                  'checkInTime': now.subtract(const Duration(hours: 2)).toIso8601String(),
                  'checkOutTime': now.toIso8601String(), // worked 2h
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isFalse);
    });

    test('9. Regression guard: exactly 2 completed sessions totaling LESS than shift duration must NOT return true', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        if (options.path.contains('/attendance')) {
          return ResponseBody.fromString(
            jsonEncode({
              'success': true,
              'data': [
                {
                  'id': '1',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 1,
                  'checkInTime': now.subtract(const Duration(hours: 4)).toIso8601String(),
                  'checkOutTime': now.subtract(const Duration(hours: 2)).toIso8601String(), // worked 2h
                  'status': 'PRESENT',
                },
                {
                  'id': '2',
                  'userId': 'user123',
                  'date': now.toIso8601String(),
                  'sessionNumber': 2,
                  'checkInTime': now.subtract(const Duration(hours: 2)).toIso8601String(),
                  'checkOutTime': now.toIso8601String(), // worked 2h
                  'status': 'PRESENT',
                }
              ]
            }),
            200,
            headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
          );
        }
        return ResponseBody.fromString('{}', 200);
      };
      await provider.fetchTodayState();
      // Total 4h worked, shift is 8h. Should be false.
      expect(provider.isDayComplete, isFalse);
    });
  });

  group('attendanceStatus tests', () {
    test('10. Empty sessions -> ABSENT', () {
      expect(provider.attendanceStatus, 'ABSENT');
    });

    test('11. Worked exactly at PRESENT threshold -> PRESENT', () async {
      final today = DateTime.now();
      // Shift Start: today 09:00
      final shiftStart = DateTime(today.year, today.month, today.day, 9, 0);
      final shiftEnd = DateTime(today.year, today.month, today.day, 17, 0);

      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': shiftStart.toIso8601String(),
                'checkOutTime': shiftEnd.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.attendanceStatus, 'PRESENT');
    });

    test('12. First punch-in > 15 min after shift start -> LATE', () async {
      final today = DateTime.now();
      final shiftStart = DateTime(today.year, today.month, today.day, 9, 0);
      final punchIn = shiftStart.add(const Duration(minutes: 20)); // 20m late (> 15m grace)
      final punchOut = shiftStart.add(const Duration(hours: 8)); // punch out exactly at shiftEnd 17:00

      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': punchIn.toIso8601String(),
                'checkOutTime': punchOut.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.attendanceStatus, 'LATE');
    });

    test('13. Last punch-out > 15 min before shift end -> EARLY_LEAVE', () async {
      final today = DateTime.now();
      final shiftStart = DateTime(today.year, today.month, today.day, 9, 0);
      final shiftEnd = DateTime(today.year, today.month, today.day, 17, 0);
      final punchIn = shiftStart;
      final punchOut = shiftEnd.subtract(const Duration(minutes: 20)); // early leave by 20m (> 15m grace)

      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': punchIn.toIso8601String(),
                'checkOutTime': punchOut.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.attendanceStatus, 'EARLY_LEAVE');
    });

    test('14. Both late AND early leave conditions true -> LATE_AND_EARLY_LEAVE', () async {
      final today = DateTime.now();
      final shiftStart = DateTime(today.year, today.month, today.day, 9, 0);
      final shiftEnd = DateTime(today.year, today.month, today.day, 17, 0);
      final punchIn = shiftStart.add(const Duration(minutes: 20)); // late 20m
      final punchOut = shiftEnd.subtract(const Duration(minutes: 20)); // early 20m

      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': punchIn.toIso8601String(),
                'checkOutTime': punchOut.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.attendanceStatus, 'LATE_AND_EARLY_LEAVE');
    });

    test('15. Worked between 50%–100% of shift -> HALF_DAY', () async {
      final today = DateTime.now();
      final shiftStart = DateTime(today.year, today.month, today.day, 9, 0);
      final shiftEnd = DateTime(today.year, today.month, today.day, 17, 0);

      // Session 1: 09:00 to 12:00 (worked 3h)
      // Session 2: 14:00 to 17:00 (worked 3h)
      // Total: 6h worked (75% of shift), no late arrival (first check-in 09:00), no early departure (last check-out 17:00)
      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': shiftStart.toIso8601String(),
                'checkOutTime': shiftStart.add(const Duration(hours: 3)).toIso8601String(),
                'status': 'PRESENT',
              },
              {
                'id': '2',
                'userId': 'user123',
                'date': today.toIso8601String(),
                'sessionNumber': 2,
                'checkInTime': shiftEnd.subtract(const Duration(hours: 3)).toIso8601String(),
                'checkOutTime': shiftEnd.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.attendanceStatus, 'HALF_DAY');
    });
  });

  group('workingHoursSummary / workingHoursProgress tests', () {
    test('16. Zero sessions -> progress = 0.0, summary shows "00:00 worked"', () {
      expect(provider.workingHoursProgress, 0.0);
      expect(provider.workingHoursSummary, '00:00 worked / 08:00 shift');
    });

    test('17. Partial worked time -> progress is worked/shift as decimal', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': now.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': now.subtract(const Duration(hours: 4)).toIso8601String(), // 4h worked
                'checkOutTime': now.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.workingHoursProgress, 0.5);
      expect(provider.workingHoursSummary, '04:00 worked / 08:00 shift');
    });

    test('18. Worked time exceeding shift duration -> progress caps at 1.0', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': now.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': now.subtract(const Duration(hours: 10)).toIso8601String(), // 10h worked
                'checkOutTime': now.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.workingHoursProgress, 1.0);
      expect(provider.workingHoursSummary, '10:00 worked / 08:00 shift');
    });
  });

  group('punchIn() / punchOut() guard tests', () {
    test('19. punchIn() rejects if isCurrentlyPunchedIn is true', () async {
      SharedPreferences.setMockInitialValues({
        'user_profile_json': shiftProfileJson,
        'punch_in_active': true,
        'punch_in_time': DateTime.now().toIso8601String(),
        'user_id': 'user123',
      });
      await StorageHelper.initialize();
      provider = AttendanceProvider();

      final res = await provider.punchIn(dummyPosition());
      expect(res.success, isFalse);
      expect(res.message, 'You are already punched in.');
    });

    test('20. punchIn() rejects if isDayComplete is true', () async {
      final now = DateTime.now();
      mockAdapter.handler = (options) {
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': [
              {
                'id': '1',
                'userId': 'user123',
                'date': now.toIso8601String(),
                'sessionNumber': 1,
                'checkInTime': now.subtract(const Duration(hours: 8)).toIso8601String(), // 8 hours worked
                'checkOutTime': now.toIso8601String(),
                'status': 'PRESENT',
              }
            ]
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };
      await provider.fetchTodayState();
      expect(provider.isDayComplete, isTrue);

      final res = await provider.punchIn(dummyPosition());
      expect(res.success, isFalse);
      expect(res.message, 'Your shift hours are complete for today. No further sessions allowed.');
    });

    test('21. punchIn() rejects if _isPunchOperationInProgress is true (mutex test)', () async {
      mockAdapter.handler = (options) async {
        await Future.delayed(const Duration(milliseconds: 50));
        return ResponseBody.fromString(
          jsonEncode({
            'success': true,
            'data': {
              'id': '123',
              'userId': 'user123',
              'date': DateTime.now().toIso8601String(),
              'sessionNumber': 1,
              'checkInTime': DateTime.now().toIso8601String(),
              'status': 'PRESENT',
            }
          }),
          200,
          headers: {Headers.contentTypeHeader: [Headers.jsonContentType]},
        );
      };

      // Start punchIn asynchronously
      final firstPunch = provider.punchIn(dummyPosition());
      
      // Let provider enter in-progress state
      await Future.delayed(const Duration(milliseconds: 5));

      // Attempt second punchIn concurrently
      final secondPunch = await provider.punchIn(dummyPosition());

      expect(secondPunch.success, isFalse);
      expect(secondPunch.message, 'A punch action is already in progress. Please wait.');

      final firstRes = await firstPunch;
      expect(firstRes.success, isTrue);
    });

    test('22. punchOut() rejects if !isCurrentlyPunchedIn', () async {
      final res = await provider.punchOut(dummyPosition());
      expect(res, isFalse);
    });
  });
}
