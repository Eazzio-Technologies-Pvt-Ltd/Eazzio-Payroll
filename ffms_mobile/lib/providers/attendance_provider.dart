import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../models/attendance_model.dart';
import '../models/user_model.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/offline_punch_cache.dart';
import '../services/alarm_service.dart';

class PunchResult {
  final bool success;
  final String message;
  final int? sessionNumber;

  PunchResult({required this.success, this.message = '', this.sessionNumber});
}

/// AttendanceProvider — Server-Confirm-First Punch-In Architecture
class AttendanceProvider extends ChangeNotifier {
  AttendanceModel? _todayAttendance;
  List<AttendanceModel> _attendanceHistory = [];
  List<AttendanceModel> _todaySessions = [];
  List<Shift> _shifts = [];
  bool _isLoading = false;
  String? _errorMessage;
  final bool _isSyncing = false;

  AttendanceModel? get todayAttendance => _todayAttendance;
  List<AttendanceModel> get attendanceHistory => _attendanceHistory;
  List<Shift> get shifts => _shifts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isSyncing => _isSyncing;
  // TASK-011: Atomic mutex — prevents concurrent punch-in/punch-out operations (race condition guard)
  bool _isPunchOperationInProgress = false;

  // Primary: check local confirmed state, fallback to API sessions
  bool get isCurrentlyPunchedIn {
    if (StorageHelper.getPunchInState()) {
      return true;
    }
    if (_todaySessions.isNotEmpty) {
      return _todaySessions.any((s) => s.punchInTime != null && s.punchOutTime == null);
    }
    return false;
  }

  bool get isPunchedIn => isCurrentlyPunchedIn;

  int get shiftDurationMinutes {
    final profileJson = StorageHelper.getUserProfileJson();
    if (profileJson != null) {
      try {
        final userMap = jsonDecode(profileJson);
        final shiftMap = userMap['shift'];
        if (shiftMap != null) {
          final startTimeStr = shiftMap['startTime'] as String?;
          final endTimeStr = shiftMap['endTime'] as String?;
          if (startTimeStr != null && endTimeStr != null && startTimeStr.isNotEmpty && endTimeStr.isNotEmpty) {
            final startParts = startTimeStr.split(':');
            final endParts = endTimeStr.split(':');
            final startMin = int.parse(startParts[0]) * 60 + int.parse(startParts[1]);
            final endMin = int.parse(endParts[0]) * 60 + int.parse(endParts[1]);
            int diffMin = endMin - startMin;
            if (diffMin < 0) {
              diffMin += 24 * 60; // Crossover midnight
            }
            return diffMin;
          }
        }
      } catch (e) {
        debugPrint('[AttendanceProvider] Error getting shiftDurationMinutes: $e');
      }
    }
    return 9 * 60; // fallback to 9 hours (540 minutes)
  }

  double get totalWorkedMinutes {
    final sessions = todaySessions;
    double totalMinutes = 0.0;
    for (final session in sessions) {
      if (session.punchOutTime != null && session.punchInTime != null) {
        totalMinutes += session.punchOutTime!.difference(session.punchInTime!).inMinutes;
      } else if (session.punchInTime != null) {
        totalMinutes += DateTime.now().difference(session.punchInTime!).inMinutes;
      }
    }
    return totalMinutes;
  }

  bool get isDayComplete {
    final sessions = todaySessions;

    // Cannot be complete while actively punched in
    if (isCurrentlyPunchedIn) return false;

    // Cannot be complete with no sessions today
    if (sessions.isEmpty) return false;

    // Cannot be complete if any session is still open (no punch-out recorded)
    if (!sessions.every((m) => m.punchOutTime != null)) return false;

    // SOLE completion criterion: total worked minutes across ALL sessions
    // must meet or exceed the shift duration.
    // sessions.length is intentionally NOT checked — an employee may meet
    // their hours in 1 session, 2 sessions, or more. Only minutes matter.
    final workedMin = totalWorkedMinutes;
    final shiftMin  = shiftDurationMinutes;
    return workedMin >= shiftMin;
  }

  // ─────────────────── TASK-007: Attendance Classification ─────────────────────
  //
  // Rules (from requirements):
  //   ABSENT       → No sessions today
  //   PRESENT      → Total worked ≥ shift duration (within 15 min grace on each end)
  //   HALF_DAY     → Worked ≥ 50% of shift but < shift duration
  //   LATE         → First punch-in was > 15 min after shift start time
  //   EARLY_LEAVE  → Last punch-out was > 15 min before shift end time
  //   (LATE and EARLY_LEAVE can co-exist — the worst violation wins for display)

  /// Returns a classification string that the UI / salary engine can consume.
  String get attendanceStatus {
    final sessions = todaySessions;

    if (sessions.isEmpty) return 'ABSENT';

    final worked = totalWorkedMinutes;
    final shiftMin = shiftDurationMinutes.toDouble();

    // Grace period for late/early checks (15 minutes)
    const gracePeriod = 15;

    // Determine late minutes from first session
    int lateMinutes = 0;
    final firstSession = sessions.first;
    final shiftStartTime = _shiftStartDateTime();
    if (shiftStartTime != null && firstSession.punchInTime != null) {
      final diff = firstSession.punchInTime!.difference(shiftStartTime).inMinutes;
      if (diff > gracePeriod) lateMinutes = diff;
    }

    // Determine early-leave minutes from last completed session
    int earlyLeaveMinutes = 0;
    final lastCompleted = sessions.lastWhere(
      (s) => s.punchOutTime != null,
      orElse: () => sessions.last,
    );
    final shiftEndTime = _shiftEndDateTime();
    if (shiftEndTime != null && lastCompleted.punchOutTime != null) {
      final diff = shiftEndTime.difference(lastCompleted.punchOutTime!).inMinutes;
      if (diff > gracePeriod) earlyLeaveMinutes = diff;
    }

    // Classification priority:
    if (worked >= shiftMin) return 'PRESENT';
    if (worked >= shiftMin * 0.5) {
      // Worked at least half — check late/early
      if (lateMinutes > 0 && earlyLeaveMinutes > 0) return 'LATE_AND_EARLY_LEAVE';
      if (lateMinutes > 0) return 'LATE';
      if (earlyLeaveMinutes > 0) return 'EARLY_LEAVE';
      return 'HALF_DAY';
    }
    // Worked less than 50 % of shift
    if (lateMinutes > 0 && earlyLeaveMinutes > 0) return 'LATE_AND_EARLY_LEAVE';
    if (lateMinutes > 0) return 'LATE';
    if (earlyLeaveMinutes > 0) return 'EARLY_LEAVE';
    return 'HALF_DAY';
  }

  // ─────────────────── TASK-008: Working Hour Formula ──────────────────────────
  //
  // Formula:
  //   workedMinutes = sum of (punchOut - punchIn) for each completed session
  //                  + (now - punchIn) for any currently-active session
  //   Displayed as "HH:MM worked / HH:MM shift"

  /// Human-readable working-hours summary string for the home screen card.
  /// Example: "05:30 worked / 09:00 shift"
  String get workingHoursSummary {
    final workedMin = totalWorkedMinutes.round();
    final shiftMin  = shiftDurationMinutes;

    final workedH   = workedMin ~/ 60;
    final workedM   = workedMin % 60;
    final shiftH    = shiftMin  ~/ 60;
    final shiftM    = shiftMin  % 60;

    final workedStr = '${workedH.toString().padLeft(2, '0')}:${workedM.toString().padLeft(2, '0')}';
    final shiftStr  = '${shiftH.toString().padLeft(2, '0')}:${shiftM.toString().padLeft(2, '0')}';

    return '$workedStr worked / $shiftStr shift';
  }

  /// Progress ratio [0.0 – 1.0] for the progress bar on the home card.
  double get workingHoursProgress {
    final shiftMin = shiftDurationMinutes.toDouble();
    if (shiftMin <= 0) return 0.0;
    return (totalWorkedMinutes / shiftMin).clamp(0.0, 1.0);
  }

  // ─────────────────── Shift Time Helpers ──────────────────────────────────────

  /// Returns today's shift start as a [DateTime], or null if unavailable.
  DateTime? _shiftStartDateTime() {
    try {
      final profileJson = StorageHelper.getUserProfileJson();
      if (profileJson == null) return null;
      final userMap = jsonDecode(profileJson) as Map<String, dynamic>;
      final shiftMap = userMap['shift'] as Map<String, dynamic>?;
      if (shiftMap == null) return null;
      final startStr = shiftMap['startTime'] as String?;
      if (startStr == null || startStr.isEmpty) return null;
      final parts = startStr.split(':');
      final now = DateTime.now();
      return DateTime(now.year, now.month, now.day, int.parse(parts[0]), int.parse(parts[1]));
    } catch (_) {
      return null;
    }
  }

  /// Returns today's shift end as a [DateTime], or null if unavailable.
  DateTime? _shiftEndDateTime() {
    try {
      final profileJson = StorageHelper.getUserProfileJson();
      if (profileJson == null) return null;
      final userMap = jsonDecode(profileJson) as Map<String, dynamic>;
      final shiftMap = userMap['shift'] as Map<String, dynamic>?;
      if (shiftMap == null) return null;
      final endStr = shiftMap['endTime'] as String?;
      if (endStr == null || endStr.isEmpty) return null;
      final parts = endStr.split(':');
      final now = DateTime.now();
      var end = DateTime(now.year, now.month, now.day, int.parse(parts[0]), int.parse(parts[1]));
      // Handle overnight shifts
      if (end.isBefore(_shiftStartDateTime() ?? end)) {
        end = end.add(const Duration(days: 1));
      }
      return end;
    } catch (_) {
      return null;
    }
  }


  List<AttendanceModel> get todaySessions {
    final list = List<AttendanceModel>.from(_todaySessions);
    // If we have a confirmed local punch-in, but the fetched sessions
    // don't show any active session, we synthesize/append one.
    final hasActiveSession = list.any((s) => s.punchOutTime == null);
    if (StorageHelper.getPunchInState() && !hasActiveSession) {
      final punchInTime = StorageHelper.getPunchInTime() ?? DateTime.now();
      final nextSession = (list.isEmpty) ? 1 : list.length + 1;
      list.add(AttendanceModel(
        id: 'local_confirmed_${punchInTime.millisecondsSinceEpoch}',
        userId: StorageHelper.getUserId() ?? '',
        date: DateTime(punchInTime.year, punchInTime.month, punchInTime.day),
        sessionNumber: nextSession,
        punchInTime: punchInTime,
        status: 'PRESENT',
      ));
    }
    return list;
  }

  Future<void> fetchShifts() async {
    try {
      final response = await ApiService.client.get('/shifts');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        _shifts = list.map((item) => Shift.fromJson(item as Map<String, dynamic>)).toList();
        notifyListeners();
      }
    } catch (e) {
      debugPrint('[AttendanceProvider] Failed to fetch shifts: $e');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SERVER-CONFIRM-FIRST PUNCH IN
  // ─────────────────────────────────────────────────────────────────────────────
  /// Performs a server-confirm-first punch-in:
  ///   1. Button enters loading state (parent UI handles this via _isPunchingIn).
  ///   2. Call punch-in API and WAIT for response.
  ///   3. On server error → return success: false, button resets, no state change.
  ///   4. On server success → save confirmed local state → update UI → return success: true.
  Future<PunchResult> punchIn(Position position, {String? selfieBase64}) async {
    // TASK-012: Invalid state transition guard — cannot punch in twice
    if (isCurrentlyPunchedIn) {
      return PunchResult(
        success: false,
        message: 'You are already punched in.',
      );
    }
    // Guard: cannot punch in if shift hours have already been completed
    if (isDayComplete) {
      return PunchResult(
        success: false,
        message: 'Your shift hours are complete for today. No further sessions allowed.',
      );
    }
    // TASK-011: Race condition guard — reject if another punch operation is running
    if (_isPunchOperationInProgress) {
      debugPrint('[AttendanceProvider] Concurrent punch operation rejected (punchIn)');
      return PunchResult(
        success: false,
        message: 'A punch action is already in progress. Please wait.',
      );
    }
    _isPunchOperationInProgress = true;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/attendance/check-in',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'selfieBase64': selfieBase64,
        },
        options: Options(
          sendTimeout: const Duration(seconds: 90),
          receiveTimeout: const Duration(seconds: 90),
        ),
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final attendance = AttendanceModel.fromJson(data);

        // Update local memory state
        _todayAttendance = attendance;
        final index = _todaySessions.indexWhere((s) => s.id == attendance.id);
        if (index != -1) {
          _todaySessions[index] = attendance;
        } else {
          _todaySessions.add(attendance);
        }

        // Save confirmed state to SharedPreferences
        await StorageHelper.setPunchInState(true);
        await StorageHelper.setPunchInTime(attendance.punchInTime ?? DateTime.now());

        // Start background location tracking immediately
        await StorageHelper.setTrackingActive(true);
        final sessionNum = attendance.sessionNumber;
        await LocationService().startTracking(shiftStatus: 'Session $sessionNum Active');

        // Cancel ALL alarms immediately on successful punch-in (TASK-005)
        // Rule: once attendance action completes, every pending alarm must be cancelled
        await AlarmService.cancelAllImmediately();

        _isLoading = false;
        notifyListeners();

        // Punch-in flow (server-confirm-first):
        // 1. Swipe → show loading animation on button
        // 2. Wait for server response — NO UI change yet
        // 3. Server error → show error, reset button
        // 4. Server success → save locally → update UI → show toast
        // 5. Fetch fresh data after 2s in background

        return PunchResult(
          success: true,
          sessionNumber: attendance.sessionNumber,
        );
      } else {
        _isLoading = false;
        notifyListeners();
        return PunchResult(
          success: false,
          message: response.data['message'] ?? 'Punch In failed',
        );
      }
    } on DioException catch (e) {
      _isLoading = false;
      // TASK-009: Network failure — cache punch offline if no server connection
      final isNetworkError = e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.response == null;

      if (isNetworkError) {
        debugPrint('[AttendanceProvider] Network failure on punch-in — caching offline');
        await OfflinePunchCache.savePendingPunchIn(
          latitude: 0.0,
          longitude: 0.0,
          timestamp: DateTime.now().toIso8601String(),
        );
        _errorMessage = 'No internet — punch saved offline and will sync automatically.';
        notifyListeners();
        return PunchResult(
          success: true, // optimistically treat as success
          message: 'Offline punch saved. Will sync when connected.',
        );
      }

      final serverMsg = e.response?.data?['error']?['message'] ?? e.message ?? 'Punch In failed';
      _errorMessage = serverMsg;
      notifyListeners();
      return PunchResult(
        success: false,
        message: serverMsg,
      );
    } catch (e) {
      _isLoading = false;
      _errorMessage = e.toString();
      notifyListeners();
      return PunchResult(
        success: false,
        message: e.toString(),
      );
    } finally {
      // TASK-011: Always release the mutex so the button can be used again
      _isPunchOperationInProgress = false;
    }
  }

  /// Sync any pending punch records that were left from a previous session.
  /// Called on app startup after fetchTodayState().
  Future<void> syncPendingPunches() async {
    final pending = await OfflinePunchCache.getPendingPunches();
    if (pending.isEmpty) return;

    debugPrint('[AttendanceSync] Found ${pending.length} pending punch(es). Syncing...');

    for (final punch in pending) {
      final type = punch['type'] as String?;
      final retryCount = punch['retryCount'] as int? ?? 0;
      
      // Skip punches that have already failed too many times
      if (retryCount >= 5) {
        debugPrint('[AttendanceSync] Skipping punch with $retryCount retries: ${punch['createdAt']}');
        continue;
      }

      try {
        if (type == 'punch_in') {
          final response = await ApiService.client.post(
            '/attendance/check-in',
            data: {
              'latitude': punch['latitude'],
              'longitude': punch['longitude'],
              if (punch['selfieBase64'] != null) 'selfieBase64': punch['selfieBase64'],
            },
            options: Options(
              sendTimeout: const Duration(seconds: 90),
              receiveTimeout: const Duration(seconds: 90),
            ),
          );

          if (response.data['success'] == true) {
            await OfflinePunchCache.removePending(punch['createdAt']);
            debugPrint('[AttendanceSync] Synced pending punch-in: ${punch['createdAt']}');
          }
        } else if (type == 'punch_out') {
          final response = await ApiService.client.post(
            '/attendance/check-out',
            data: {
              'latitude': punch['latitude'],
              'longitude': punch['longitude'],
              if (punch['selfieBase64'] != null) 'selfieBase64': punch['selfieBase64'],
              'triggerType': punch['triggerType'] ?? 'MANUAL',
            },
            options: Options(
              sendTimeout: const Duration(seconds: 90),
              receiveTimeout: const Duration(seconds: 90),
            ),
          );

          if (response.data['success'] == true) {
            await OfflinePunchCache.removePending(punch['createdAt']);
            debugPrint('[AttendanceSync] Synced pending punch-out: ${punch['createdAt']}');
          }
        }
      } on DioException catch (e) {
        // If server explicitly rejects (4xx), remove from cache
        if (e.response != null && e.response!.statusCode != null && e.response!.statusCode! < 500) {
          await OfflinePunchCache.removePending(punch['createdAt']);
          debugPrint('[AttendanceSync] Server rejected pending punch, removed: ${punch['createdAt']}');
        } else {
          await OfflinePunchCache.incrementRetry(punch['createdAt']);
          debugPrint('[AttendanceSync] Retry incremented for: ${punch['createdAt']}');
        }
      } catch (e) {
        await OfflinePunchCache.incrementRetry(punch['createdAt']);
        debugPrint('[AttendanceSync] Unexpected error syncing: $e');
      }
    }

    // Refresh state after sync
    await fetchTodayState();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUNCH OUT (kept synchronous — no selfie, fast operation)
  // ─────────────────────────────────────────────────────────────────────────────
  Future<bool> punchOut(Position position, {String? selfieBase64, String triggerType = 'MANUAL'}) async {
    // TASK-012: Invalid state transition — cannot punch out if not currently punched in
    if (!isCurrentlyPunchedIn) {
      debugPrint('[AttendanceProvider] Invalid state: punchOut called but not currently punched in');
      return false;
    }
    // TASK-011: Race condition guard — reject if another punch operation is already running
    if (_isPunchOperationInProgress) {
      debugPrint('[AttendanceProvider] Concurrent punch operation rejected (punchOut)');
      return false;
    }
    _isPunchOperationInProgress = true;
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/attendance/check-out',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          'selfieBase64': selfieBase64,
          'triggerType': triggerType,
        },
      );

      if (response.data['success'] == true) {
        _todayAttendance = AttendanceModel.fromJson(response.data['data']);
        
        // Clear confirmed punch-in state locally upon successful punch-out
        await StorageHelper.clearPunchInState();
        
        await fetchTodayState();
        await fetchHistory();
        
        // Stop location tracking upon punch-out
        await StorageHelper.setTrackingActive(false);
        await LocationService().stopTracking();

        // Cancel ALL alarms immediately on successful punch-out (TASK-005)
        await AlarmService.cancelAllImmediately();
        
        return true;
      }
    } on DioException catch (e) {
      // TASK-009: Network failure — cache punch-out offline if no server connection
      final isNetworkError = e.type == DioExceptionType.connectionError ||
          e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout ||
          e.response == null;

      if (isNetworkError) {
        debugPrint('[AttendanceProvider] Network failure on punch-out — caching offline');
        await OfflinePunchCache.savePendingPunchOut(
          latitude: 0.0,
          longitude: 0.0,
          timestamp: DateTime.now().toIso8601String(),
          triggerType: 'MANUAL',
        );
        _errorMessage = 'No internet — punch-out saved offline and will sync automatically.';
        _isLoading = false;
        notifyListeners();
        return true; // optimistic success
      }

      _errorMessage = e.response?.data?['error']?['message'] ?? 'Punch Out failed';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      // TASK-011: Always release the mutex
      _isPunchOperationInProgress = false;
      notifyListeners();
    }
    return false;
  }

  // Fetch today's current punch state
  Future<void> fetchTodayState() async {
    try {
      final response = await ApiService.client.get('/attendance');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        final localNow = DateTime.now();
        
        final currentUserId = StorageHelper.getUserId();
        
        // Find if punch exists for today using robust local time comparison
        final todayLogs = list.where((item) {
          if (currentUserId != null && item['userId'] != currentUserId) {
            return false;
          }
          final dateStr = item['date'] as String;
          try {
            final parsedDate = DateTime.parse(dateStr).toLocal();
            return parsedDate.year == localNow.year &&
                   parsedDate.month == localNow.month &&
                   parsedDate.day == localNow.day;
          } catch (_) {
            return dateStr.substring(0, 10) == localNow.toIso8601String().substring(0, 10);
          }
        }).toList();

        if (todayLogs.isNotEmpty) {
          final models = todayLogs
              .map((item) => AttendanceModel.fromJson(item as Map<String, dynamic>))
              .toList();
          models.sort((a, b) => a.sessionNumber.compareTo(b.sessionNumber));
          _todaySessions = models;
          
          // Find if there is an active/open session
          // or fallback to the latest session by sessionNumber
          try {
            final activeSession = models.firstWhere(
              (m) => m.punchOutTime == null,
            );
            _todayAttendance = activeSession;
          } catch (_) {
            _todayAttendance = models.reduce((a, b) => a.sessionNumber > b.sessionNumber ? a : b);
          }
          
          // Auto start location tracking if already punched in
          if (isPunchedIn) {
            final sessionNum = _todayAttendance?.sessionNumber ?? 1;
            await LocationService().startTracking(shiftStatus: 'Session $sessionNum Active');
          }
        } else {
          // CRITICAL FIX:
          // Fetch returned empty — check if we have a confirmed local punch-in.
          // If yes — backend hasn't indexed the new record yet — keep existing state.
          final isPunchedIn = StorageHelper.getPunchInState();
          if (isPunchedIn) {
            debugPrint('[Attendance] Fetch returned empty but confirmed '
                'punch-in is active — keeping local state, ignoring stale fetch');
            return; // EXIT — do not overwrite confirmed local state
          }
          _todaySessions = [];
          _todayAttendance = null;
        }
      }
    } catch (e) {
      // Catch silently — if network fails, keep any optimistic state
    }
    notifyListeners();
  }

  // Fetch personal history
  Future<void> fetchHistory() async {
    try {
      final response = await ApiService.client.get('/attendance');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        final currentUserId = StorageHelper.getUserId();
        final fetched = list
            .where((item) => currentUserId == null || item['userId'] == currentUserId)
            .map((item) => AttendanceModel.fromJson(item as Map<String, dynamic>))
            .toList();
        
        // Sort history: first by date descending, then by sessionNumber descending
        fetched.sort((a, b) {
          final dateCompare = b.date.compareTo(a.date);
          if (dateCompare != 0) return dateCompare;
          return b.sessionNumber.compareTo(a.sessionNumber);
        });
        
        _attendanceHistory = fetched;
      }
    } catch (e) {
      // Catch silently
    }
    notifyListeners();
  }
}
