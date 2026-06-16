import 'dart:convert';
import 'package:dio/dio.dart';
import 'api_service.dart';
import '../core/utils/storage_helper.dart';
import '../models/user_model.dart';

class AuthService {
  // Login handler
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await ApiService.client.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
        },
      );

      if (response.data['success'] == true) {
        final data = response.data['data'];
        final accessToken = data['accessToken'] as String;
        final refreshToken = data['refreshToken'] as String;
        final userJson = data['user'] as Map<String, dynamic>;
        
        final user = UserModel.fromJson(userJson);

        // Save tokens & info
        await StorageHelper.saveAccessToken(accessToken);
        await StorageHelper.saveRefreshToken(refreshToken);
        await StorageHelper.saveUserProfileJson(jsonEncode(userJson));
        await StorageHelper.saveUserInfo(
          id: user.id,
          role: user.role,
          orgId: user.organization?.id ?? '',
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
        );

        return {'success': true, 'user': user};
      }
      return {'success': false, 'error': response.data['error']?['message'] ?? 'Login failed'};
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Connection error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': 'An unexpected error occurred: $e'};
    }
  }

  // Get current user profile
  Future<UserModel?> getProfile() async {
    try {
      final response = await ApiService.client.get('/auth/me');
      if (response.data['success'] == true) {
        final userJson = response.data['data']['user'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userJson);
        await StorageHelper.saveUserProfileJson(jsonEncode(userJson));
        await StorageHelper.saveUserInfo(
          id: user.id,
          role: user.role,
          orgId: user.organization?.id ?? '',
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
        );
        return user;
      }
    } catch (e) {
      // Return null or handle silently
    }
    return null;
  }

  // Logout handler
  Future<bool> logout() async {
    try {
      final refreshToken = await StorageHelper.getRefreshToken();
      if (refreshToken != null) {
        await ApiService.client.post(
          '/auth/logout',
          data: {'refreshToken': refreshToken},
        );
      }
    } catch (e) {
      // Proceed with local logout anyway
    } finally {
      await StorageHelper.clearAll();
    }
    return true;
  }

  // Request OTP for forgot password
  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await ApiService.client.post(
        '/auth/forgot-password',
        data: {'email': email},
      );
      if (response.data['success'] == true) {
        return {'success': true, 'message': response.data['data']?['message'] ?? 'OTP sent successfully'};
      }
      return {'success': false, 'error': response.data['error']?['message'] ?? 'Failed to send OTP'};
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Connection error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': 'An unexpected error occurred: $e'};
    }
  }

  // Verify OTP
  Future<Map<String, dynamic>> verifyOtp(String email, String otp) async {
    try {
      final response = await ApiService.client.post(
        '/auth/verify-otp',
        data: {'email': email, 'otp': otp},
      );
      if (response.data['success'] == true) {
        final resetToken = response.data['data']?['resetToken'] as String?;
        return {'success': true, 'resetToken': resetToken};
      }
      return {'success': false, 'error': response.data['error']?['message'] ?? 'Invalid OTP'};
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Connection error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': 'An unexpected error occurred: $e'};
    }
  }

  // Reset Password
  Future<Map<String, dynamic>> resetPassword(String resetToken, String newPassword) async {
    try {
      final response = await ApiService.client.post(
        '/auth/reset-password',
        data: {
          'resetToken': resetToken,
          'newPassword': newPassword,
        },
      );
      if (response.data['success'] == true) {
        return {'success': true, 'message': response.data['data']?['message'] ?? 'Password reset successfully'};
      }
      return {'success': false, 'error': response.data['error']?['message'] ?? 'Failed to reset password'};
    } on DioException catch (e) {
      final message = e.response?.data?['error']?['message'] ?? 'Connection error';
      return {'success': false, 'error': message};
    } catch (e) {
      return {'success': false, 'error': 'An unexpected error occurred: $e'};
    }
  }

  // Update Profile Image (upload and lock)
  Future<UserModel?> updateProfileImage(String base64Image) async {
    try {
      final response = await ApiService.client.patch(
        '/auth/profile/image',
        data: {'base64Image': base64Image},
      );
      if (response.data['success'] == true) {
        final userJson = response.data['data']['user'] as Map<String, dynamic>;
        final user = UserModel.fromJson(userJson);
        await StorageHelper.saveUserInfo(
          id: user.id,
          role: user.role,
          orgId: user.organization?.id ?? '',
          name: user.name,
          email: user.email,
          employeeId: user.employeeId,
        );
        return user;
      }
    } catch (e) {
      // Log or handle
    }
    return null;
  }
}
