import 'dart:convert';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../core/utils/storage_helper.dart';
import '../models/user_model.dart';
import '../services/alarm_service.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';

enum AuthState { initial, loading, authenticated, unauthenticated }

/// `AuthProvider` serves as the central State Manager for user authentication.
/// It wraps the `AuthService` and broadcasts state changes (`ChangeNotifier`)
/// across the entire Flutter widget tree.
/// 
/// Integrations:
/// - Secures the `SocketService` by connecting/disconnecting upon login/logout.
/// - Controls the Root Application flow (Splash Screen -> Login vs Dashboard).
class AuthProvider extends ChangeNotifier {
  final AuthService _authService = AuthService();
  
  AuthState _state = AuthState.initial;
  UserModel? _currentUser;
  String? _errorMessage;
  Timer? _autoPunchOutTimer;

  Future<void> _performAutoPunchOut() async {
    debugPrint('[AutoPunchOut] Shift end reached. Initiating auto punch-out...');
    
    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.low,
        timeLimit: const Duration(seconds: 5),
      );
    } catch (e) {
      debugPrint('[AutoPunchOut] Failed to get location for auto punch out: $e');
    }

    if (StorageHelper.getPunchInState()) {
      debugPrint('[AutoPunchOut] User is punched in. Performing auto punch-out API call...');
      try {
        await ApiService.client.post(
          '/attendance/check-out',
          data: {
            'latitude': position?.latitude ?? 0.0,
            'longitude': position?.longitude ?? 0.0,
            'triggerType': 'AUTO_OUT',
          },
        );
      } catch (e) {
        debugPrint('[AutoPunchOut] Auto punch-out API call failed: $e');
      }

      try {
        await StorageHelper.clearPunchInState();
        await StorageHelper.setTrackingActive(false);
        await LocationService().stopTracking();
      } catch (e) {
        debugPrint('[AutoPunchOut] Failed to clean up location tracking locally: $e');
      }

      try {
        await AlarmService.cancelAll();
      } catch (e) {
        debugPrint('[AutoPunchOut] Failed to cancel alarms: $e');
      }
    }
  }

  void _scheduleAutoPunchOut() {
    _autoPunchOutTimer?.cancel();
    _autoPunchOutTimer = null;

    final user = _currentUser;
    if (user == null || user.shift == null) return;

    final startTimeStr = user.shift!.startTime;
    final endTimeStr = user.shift!.endTime;
    if (endTimeStr.isEmpty || startTimeStr.isEmpty) return;

    try {
      final startParts = startTimeStr.split(':');
      final startHour = int.parse(startParts[0]);
      final startMinute = int.parse(startParts[1]);

      final endParts = endTimeStr.split(':');
      final endHour = int.parse(endParts[0]);
      final endMinute = int.parse(endParts[1]);

      final now = DateTime.now();
      final startToday = DateTime(now.year, now.month, now.day, startHour, startMinute);
      var endToday = DateTime(now.year, now.month, now.day, endHour, endMinute);

      // Handle overnight shift wraps
      if (endToday.isBefore(startToday)) {
        endToday = endToday.add(const Duration(days: 1));
      }

      // Auto punch-out is targetted exactly 30 minutes after the shift end time
      var punchOutTargetTime = endToday.add(const Duration(minutes: 30));

      // If the target time (shift end + 30 minutes) has already passed today, check if user is still punched in.
      // Otherwise schedule it for the next day's shift end + 30 minutes.
      if (punchOutTargetTime.isBefore(now)) {
        if (StorageHelper.getPunchInState()) {
          debugPrint('[AutoPunchOut] Current time has already passed the shift end + 30 minutes. Triggering auto punch-out immediately.');
          _performAutoPunchOut();
          return;
        }
        punchOutTargetTime = punchOutTargetTime.add(const Duration(days: 1));
      }

      final duration = punchOutTargetTime.difference(now);
      debugPrint('[AutoPunchOut] Scheduling auto punch-out in ${duration.inHours}h ${duration.inMinutes % 60}m at ${punchOutTargetTime.toLocal()} (30 minutes after shift end)');

      _autoPunchOutTimer = Timer(duration, () async {
        await _performAutoPunchOut();
      });
    } catch (e) {
      debugPrint('[AutoPunchOut] Error scheduling auto punch-out: $e');
    }
  }

  AuthState get state => _state;
  UserModel? get currentUser => _currentUser;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _state == AuthState.authenticated;

  // Auto-login check at startup
  Future<void> checkAuthStatus() async {
    _state = AuthState.loading;
    notifyListeners();

    await StorageHelper.initialize();
    final accessToken = await StorageHelper.getAccessToken();

    if (accessToken != null) {
      final cachedId = StorageHelper.getUserId();
      final cachedName = StorageHelper.getUserName();
      final cachedEmail = StorageHelper.getUserEmail();
      final cachedRole = StorageHelper.getUserRole();
      final cachedEmployeeId = StorageHelper.getEmployeeId();
      final cachedProfileJson = StorageHelper.getUserProfileJson();

      if (cachedProfileJson != null) {
        try {
          _currentUser = UserModel.fromJson(jsonDecode(cachedProfileJson));
        } catch (_) {}
      }

      if (_currentUser != null) {
        _state = AuthState.authenticated;
        notifyListeners();

        // Connect socket in background
        SocketService.connect().catchError((_) {});

        // Fetch fresh profile in the background to update cached data without blocking app launch
        _authService.getProfile().then((freshUser) async {
          if (freshUser != null) {
            _currentUser = freshUser;
            notifyListeners();
          } else {
            final token = await StorageHelper.getAccessToken();
            if (token == null) {
              logout();
            }
          }
        }).catchError((_) {});
      } else if (cachedId != null && cachedName != null && cachedEmail != null && cachedRole != null) {
        _currentUser = UserModel(
          id: cachedId,
          name: cachedName,
          email: cachedEmail,
          role: cachedRole,
          status: 'ACTIVE',
          employeeId: cachedEmployeeId,
        );
        _state = AuthState.authenticated;
        notifyListeners();

        // Connect socket in background
        SocketService.connect().catchError((_) {});

        // Fetch fresh profile in the background to update cached data without blocking app launch
        _authService.getProfile().then((freshUser) async {
          if (freshUser != null) {
            _currentUser = freshUser;
            notifyListeners();
          } else {
            final token = await StorageHelper.getAccessToken();
            if (token == null) {
              logout();
            }
          }
        }).catchError((_) {});
      } else {
        final user = await _authService.getProfile();
        if (user != null) {
          _currentUser = user;
          _state = AuthState.authenticated;
          await SocketService.connect();
        } else {
          _state = AuthState.unauthenticated;
        }
      }
    } else {
      _state = AuthState.unauthenticated;
    }
    notifyListeners();

    if (_state == AuthState.authenticated && _currentUser != null) {
      _scheduleAutoPunchOut();
      AlarmService.syncAlarms(_currentUser?.shift?.startTime, _currentUser?.shift?.endTime).catchError((e) {
        debugPrint('Error syncing alarms in checkAuthStatus: $e');
      });
    }
  }

  // Handle Login
  Future<bool> login(String email, String password) async {
    _state = AuthState.loading;
    _errorMessage = null;
    notifyListeners();

    final result = await _authService.login(email, password);

    if (result['success'] == true) {
      _currentUser = result['user'] as UserModel;
      _state = AuthState.authenticated;
      await SocketService.connect();
      notifyListeners();
      
      _scheduleAutoPunchOut();
      AlarmService.syncAlarms(_currentUser?.shift?.startTime, _currentUser?.shift?.endTime).catchError((e) {
        debugPrint('Error syncing alarms on login: $e');
      });

      return true;
    } else {
      _errorMessage = result['error'] as String;
      _state = AuthState.unauthenticated;
      notifyListeners();
      return false;
    }
  }

  // Handle Logout
  // Clears local state immediately (instant UX) and fires the server
  // logout API in the background so the user is never blocked on network.
  void logout() {
    // 1. Immediately update local state so UI can navigate away at once
    _currentUser = null;
    _state = AuthState.unauthenticated;
    
    _autoPunchOutTimer?.cancel();
    _autoPunchOutTimer = null;
    
    notifyListeners();

    // 2. Disconnect socket right away
    SocketService.disconnect();

    // Cancel all scheduled alarms and stop active rings
    AlarmService.cancelAll().catchError((e) {
      debugPrint('Error cancelling alarms on logout: $e');
    });

    // 3. Clear stored tokens + notify server in background (non-blocking)
    _authService.logout().catchError((_) {});
  }

  // Upload Profile Image
  Future<bool> uploadProfileImage(String base64Image) async {
    _state = AuthState.loading;
    _errorMessage = null;
    notifyListeners();

    final updatedUser = await _authService.updateProfileImage(base64Image);
    if (updatedUser != null) {
      _currentUser = updatedUser;
      _state = AuthState.authenticated;
      notifyListeners();
      return true;
    } else {
      _errorMessage = 'Failed to upload profile image';
      _state = AuthState.authenticated; // Keep authenticated
      notifyListeners();
      return false;
    }
  }

  // Forgot password flows
  Future<Map<String, dynamic>> forgotPassword(String email) => _authService.forgotPassword(email);
  Future<Map<String, dynamic>> verifyOtp(String email, String otp) => _authService.verifyOtp(email, otp);
  Future<Map<String, dynamic>> resetPassword(String resetToken, String newPassword) => _authService.resetPassword(resetToken, newPassword);
}
