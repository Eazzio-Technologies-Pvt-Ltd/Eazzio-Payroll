import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../services/socket_service.dart';
import '../core/utils/storage_helper.dart';
import '../models/user_model.dart';

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
        _authService.getProfile().then((freshUser) {
          if (freshUser != null) {
            _currentUser = freshUser;
            notifyListeners();
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
        _authService.getProfile().then((freshUser) {
          if (freshUser != null) {
            _currentUser = freshUser;
            notifyListeners();
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
    notifyListeners();

    // 2. Disconnect socket right away
    SocketService.disconnect();

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
