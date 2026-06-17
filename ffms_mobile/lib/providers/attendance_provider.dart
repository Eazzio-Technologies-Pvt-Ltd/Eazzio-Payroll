import 'dart:async';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../models/attendance_model.dart';
import '../models/user_model.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/offline_punch_cache.dart';

class PunchResult {
  final bool success;
  final String message;
  final int? sessionNumber;

  PunchResult({required this.success, this.message = '', this.sessionNumber});
}

/// AttendanceProvider — Server-Confirm-First Punch-In Architecture
///
/// Flow:
///   1. Swipe → show loading animation on button
///   2. Wait for server response — NO UI change yet
///   3. Server error → show error, reset button
///   4. Server success → save locally → update UI → show toast
///   5. Fetch fresh data after 2s in background
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

  // Primary: check local confirmed state, fallback to API sessions
  bool get isCurrentlyPunchedIn {
    if (StorageHelper.getPunchInState()) {
      return true;
    }
    if (_todaySessions.isNotEmpty) {
      final lastSession = _todaySessions.last;
      return lastSession.punchInTime != null && lastSession.punchOutTime == null;
    }
    return false;

    // Add comment:
    // // isCurrentlyPunchedIn checks API data first, confirmed local state second
    // // Local state only written AFTER server confirmation
    // // This means: local state = server-confirmed, safe to use as fallback
  }

  bool get isPunchedIn => isCurrentlyPunchedIn;
  bool get isDayComplete => todaySessions.length >= 2 && todaySessions.every((m) => m.punchOutTime != null);

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
  // Punch Out handler (renamed from checkOut as per v2 spec)
  Future<bool> punchOut(Position position) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/attendance/check-out',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
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
        
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Punch Out failed';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
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
        
        // Find if punch exists for today using robust local time comparison
        final todayLogs = list.where((item) {
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
        final fetched = list
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
