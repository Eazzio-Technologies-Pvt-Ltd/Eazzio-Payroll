import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../providers/attendance_provider.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/notification_helper.dart';

/// AutoPunchOutService — Handles two auto-punch-out triggers:
///
/// 1. **9-Hour Rule**: If a user has been punched in for ≥ 9 hours,
///    they are automatically punched out with location + notification.
///
/// 2. **Midnight Reset (12:00 AM)**: Any open punch session is force-closed
///    at midnight, local state is cleared, and a notification is sent.
///
/// Usage:
///   AutoPunchOutService.instance.start(attendanceProvider);
///   AutoPunchOutService.instance.stop(); // call on logout / dispose
class AutoPunchOutService {
  AutoPunchOutService._internal();
  static final AutoPunchOutService instance = AutoPunchOutService._internal();

  Timer? _periodicTimer;   // checks every 60 seconds
  Timer? _midnightTimer;   // fires once at 12:00:00 AM

  AttendanceProvider? _attendanceProvider;

  static const int _maxShiftHours = 9; // auto-punch-out after 9 hours

  // ─────────────────────────────────────────────────────────────────────────
  // Start / Stop
  // ─────────────────────────────────────────────────────────────────────────

  /// Start the service. Call this right after the user is authenticated
  /// (e.g., in MainNavigation.initState).
  void start(AttendanceProvider provider) {
    stop(); // Clear any existing timers first
    _attendanceProvider = provider;

    debugPrint('[AutoPunchOut] Service started.');

    // ── 1. Periodic check every 60 seconds ──────────────────────────────────
    _periodicTimer = Timer.periodic(const Duration(seconds: 60), (_) {
      _checkNineHourRule();
    });

    // ── 2. Schedule midnight reset ───────────────────────────────────────────
    _scheduleMidnightTimer();
  }

  /// Stop all timers. Call on logout or app dispose.
  void stop() {
    _periodicTimer?.cancel();
    _periodicTimer = null;
    _midnightTimer?.cancel();
    _midnightTimer = null;
    _attendanceProvider = null;
    debugPrint('[AutoPunchOut] Service stopped.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 9-Hour Rule
  // ─────────────────────────────────────────────────────────────────────────

  Future<void> _checkNineHourRule() async {
    final provider = _attendanceProvider;
    if (provider == null) return;

    // Only act if the user is currently punched in
    if (!StorageHelper.getPunchInState()) return;

    final punchInTime = StorageHelper.getPunchInTime();
    if (punchInTime == null) return;

    final hoursElapsed = DateTime.now().difference(punchInTime).inHours;

    if (hoursElapsed >= _maxShiftHours) {
      debugPrint('[AutoPunchOut] 9-hour rule triggered. Punched in at $punchInTime. '
          'Hours elapsed: $hoursElapsed. Executing auto punch-out...');
      await _executePunchOut(
        reason: '9-hour limit reached',
        notificationTitle: 'Auto Punch-Out',
        notificationBody:
            'You have been automatically punched out after $_maxShiftHours hours. '
            'Please verify your attendance.',
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Midnight Reset
  // ─────────────────────────────────────────────────────────────────────────

  void _scheduleMidnightTimer() {
    final now = DateTime.now();
    // Next midnight = start of tomorrow
    final nextMidnight = DateTime(now.year, now.month, now.day + 1, 0, 0, 0);
    final durationUntilMidnight = nextMidnight.difference(now);

    debugPrint('[AutoPunchOut] Midnight reset scheduled in '
        '${durationUntilMidnight.inHours}h ${durationUntilMidnight.inMinutes % 60}m.');

    _midnightTimer = Timer(durationUntilMidnight, () async {
      debugPrint('[AutoPunchOut] Midnight reached — executing daily reset.');
      await _executeMidnightReset();
      // Re-schedule for the NEXT midnight
      _scheduleMidnightTimer();
    });
  }

  Future<void> _executeMidnightReset() async {
    final provider = _attendanceProvider;
    if (provider == null) return;

    // If still punched in at midnight, force punch-out
    if (StorageHelper.getPunchInState()) {
      debugPrint('[AutoPunchOut] Midnight: active session detected — forcing punch-out.');
      await _executePunchOut(
        reason: 'midnight reset',
        notificationTitle: 'Midnight Auto Punch-Out',
        notificationBody:
            'A new work day has started. Your previous session has been '
            'automatically closed. Please punch in when you start today.',
      );
    } else {
      // No open session — just ensure local state is clean
      await StorageHelper.clearPunchInState();
      debugPrint('[AutoPunchOut] Midnight reset: no active session. State cleared.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core Auto Punch-Out Logic
  // ─────────────────────────────────────────────────────────────────────────

  Future<void> _executePunchOut({
    required String reason,
    required String notificationTitle,
    required String notificationBody,
  }) async {
    final provider = _attendanceProvider;
    if (provider == null) return;

    try {
      // ── Get last known location ──────────────────────────────────────────
      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.medium,
          timeLimit: const Duration(seconds: 10),
        );
      } catch (e) {
        position = await Geolocator.getLastKnownPosition();
        debugPrint('[AutoPunchOut] getCurrentPosition failed, '
            'using last known: $position. Error: $e');
      }

      // Fallback: if both fail, use 0,0 — server handles gracefully
      final Position resolvedPosition = position ??
          Position(
            latitude: 0,
            longitude: 0,
            timestamp: DateTime.now(),
            accuracy: 0,
            altitude: 0,
            heading: 0,
            speed: 0,
            speedAccuracy: 0,
            altitudeAccuracy: 0,
            headingAccuracy: 0,
          );

      debugPrint('[AutoPunchOut] Calling punchOut API. Reason: $reason. '
          'Location: ${resolvedPosition.latitude}, ${resolvedPosition.longitude}');

      // ── Call punch-out API (no selfie for auto punch-out) ───────────────
      final success = await provider.punchOut(
        resolvedPosition,
        selfieBase64: null, // Auto punch-out skips selfie
        triggerType: 'AUTO',
      );

      if (success) {
        debugPrint('[AutoPunchOut] ✅ Auto punch-out successful. Reason: $reason');
        // Show a local push notification to alert the user
        await NotificationHelper.showAutoPunchOutNotification(
          title: notificationTitle,
          body: notificationBody,
        );
      } else {
        debugPrint('[AutoPunchOut] ❌ Auto punch-out API failed. '
            'Clearing local state as fallback. Reason: $reason');
        // Even if API fails, clear local state to avoid a permanently "stuck" session
        await StorageHelper.clearPunchInState();
        await NotificationHelper.showAutoPunchOutNotification(
          title: notificationTitle,
          body: '$notificationBody (Network sync pending)',
        );
      }
    } catch (e) {
      debugPrint('[AutoPunchOut] Unexpected error during auto punch-out: $e');
      // Safety net: always clear local punch-in state to prevent stale UI
      await StorageHelper.clearPunchInState();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public helpers
  // ─────────────────────────────────────────────────────────────────────────

  bool get isRunning => _periodicTimer?.isActive == true;
}
