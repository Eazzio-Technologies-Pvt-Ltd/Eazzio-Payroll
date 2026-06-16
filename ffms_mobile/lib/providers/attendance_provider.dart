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

/// AttendanceProvider — Optimistic Punch-In Architecture
///
/// Flow:
///   1. Save selfie + GPS + timestamp locally (OfflinePunchCache).
///   2. **Immediately** update UI state → user sees "Punched In".
///   3. Fire backend sync in background with 3 retries.
///   4. On success → update with real server data.
///   5. On failure → data stays cached; sync retried on next app launch.
///   6. If backend rejects (e.g. geofence violation) → rollback UI + notify user.
class AttendanceProvider extends ChangeNotifier {
  AttendanceModel? _todayAttendance;
  List<AttendanceModel> _attendanceHistory = [];
  List<AttendanceModel> _todaySessions = [];
  List<Shift> _shifts = [];
  bool _isLoading = false;
  String? _errorMessage;
  bool _isSyncing = false;

  AttendanceModel? get todayAttendance => _todayAttendance;
  List<AttendanceModel> get attendanceHistory => _attendanceHistory;
  List<AttendanceModel> get todaySessions => _todaySessions;
  List<Shift> get shifts => _shifts;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isSyncing => _isSyncing;

  // Renamed from Check In/Out to Punch In/Out as per v2 spec
  bool get isPunchedIn => _todayAttendance != null && _todayAttendance!.punchOutTime == null;
  bool get isDayComplete => _todaySessions.length >= 2 && _todaySessions.every((m) => m.punchOutTime != null);

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
  // OPTIMISTIC PUNCH IN
  // ─────────────────────────────────────────────────────────────────────────────
  /// Performs an optimistic punch-in:
  ///   1. Saves data to local cache immediately.
  ///   2. Creates a local AttendanceModel and updates the UI instantly.
  ///   3. Fires the backend API call in the background with retries.
  ///   4. If backend rejects, rolls back the UI and shows an error.
  Future<bool> punchIn(Position position, {String? selfieBase64}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final now = DateTime.now();
    final String createdAt = now.toIso8601String();

    // ── Step 1: Save to local cache FIRST ──────────────────────────────────
    await OfflinePunchCache.savePendingPunchIn(
      latitude: position.latitude,
      longitude: position.longitude,
      timestamp: createdAt,
      selfieBase64: selfieBase64,
    );

    // ── Step 2: Optimistically update UI ───────────────────────────────────
    final nextSession = (_todaySessions.isEmpty) ? 1 : _todaySessions.length + 1;
    final optimisticModel = AttendanceModel(
      id: 'pending_$createdAt',  // Temporary ID until server responds
      userId: StorageHelper.getUserId() ?? '',
      date: DateTime(now.year, now.month, now.day),
      sessionNumber: nextSession,
      punchInTime: now,
      punchInLat: position.latitude,
      punchInLng: position.longitude,
      status: 'PRESENT',
    );

    _todayAttendance = optimisticModel;
    _todaySessions.add(optimisticModel);
    _isLoading = false;
    notifyListeners();

    // Save punch-in time locally for the timer display
    await StorageHelper.savePunchInTime(createdAt);
    await StorageHelper.clearPunchOutTime();

    // Start background location tracking immediately
    await StorageHelper.setTrackingActive(true);
    await LocationService().startTracking(shiftStatus: 'Session $nextSession Active');

    // ── Step 3: Background sync to backend ─────────────────────────────────
    _syncPunchInToBackend(position, selfieBase64, createdAt);

    return true; // Always returns true for optimistic UI
  }

  /// Background sync with 3 retries and exponential backoff.
  /// If successful, replaces optimistic data with server data.
  /// If server rejects (400 error like geofence), rolls back UI.
  Future<void> _syncPunchInToBackend(Position position, String? selfieBase64, String createdAt) async {
    _isSyncing = true;
    notifyListeners();

    const int maxRetries = 3;
    const List<int> backoffSeconds = [5, 15, 30]; // Exponential backoff

    for (int attempt = 0; attempt < maxRetries; attempt++) {
      try {
        debugPrint('[AttendanceSync] Attempt ${attempt + 1}/$maxRetries for punch-in...');

        final response = await ApiService.client.post(
          '/attendance/check-in',
          data: {
            'latitude': position.latitude,
            'longitude': position.longitude,
            if (selfieBase64 != null) 'selfieBase64': selfieBase64,
          },
          options: Options(
            sendTimeout: const Duration(seconds: 90),
            receiveTimeout: const Duration(seconds: 90),
          ),
        );

        if (response.data['success'] == true) {
          // ── SUCCESS: Replace optimistic data with real server data ────────
          _todayAttendance = AttendanceModel.fromJson(response.data['data']);
          await OfflinePunchCache.removePending(createdAt);
          await fetchTodayState();
          await fetchHistory();
          _isSyncing = false;
          _errorMessage = null;
          notifyListeners();
          debugPrint('[AttendanceSync] Punch-in synced successfully!');
          return;
        }
      } on DioException catch (e) {
        // ── Server explicitly rejected (400) → ROLLBACK ────────────────────
        if (e.response != null && e.response!.statusCode != null && e.response!.statusCode! < 500) {
          final serverMsg = e.response?.data?['error']?['message'] ?? 'Punch In rejected by server';
          debugPrint('[AttendanceSync] Server rejected punch-in: $serverMsg');

          // Rollback optimistic UI
          _todaySessions.removeWhere((m) => m.id == 'pending_$createdAt');
          if (_todaySessions.isNotEmpty) {
            _todayAttendance = _todaySessions.last;
          } else {
            _todayAttendance = null;
          }
          await OfflinePunchCache.removePending(createdAt);
          await StorageHelper.clearPunchInTime();
          await StorageHelper.setTrackingActive(false);
          await LocationService().stopTracking();

          _errorMessage = serverMsg;
          _isSyncing = false;
          notifyListeners();
          return;
        }

        // ── Network/Server error (5xx, timeout) → Retry ────────────────────
        debugPrint('[AttendanceSync] Attempt ${attempt + 1} failed: ${e.message}');
        await OfflinePunchCache.incrementRetry(createdAt);

        if (attempt < maxRetries - 1) {
          await Future.delayed(Duration(seconds: backoffSeconds[attempt]));
        }
      } catch (e) {
        debugPrint('[AttendanceSync] Attempt ${attempt + 1} unexpected error: $e');
        await OfflinePunchCache.incrementRetry(createdAt);

        if (attempt < maxRetries - 1) {
          await Future.delayed(Duration(seconds: backoffSeconds[attempt]));
        }
      }
    }

    // ── All retries exhausted — keep optimistic UI, data is cached ──────────
    _isSyncing = false;
    _errorMessage = 'Punch-in saved locally. Will sync when network is available.';
    notifyListeners();
    debugPrint('[AttendanceSync] All retries exhausted. Data cached locally for next sync.');
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
