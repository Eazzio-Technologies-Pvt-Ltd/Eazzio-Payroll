import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/leave_model.dart';
import '../services/socket_service.dart';

class LeaveProvider extends ChangeNotifier {
  List<LeaveModel> _leaves = [];
  List<LeaveBalanceModel> _balances = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<LeaveModel> get leaves => _leaves;
  List<LeaveBalanceModel> get balances => _balances;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  LeaveProvider() {
    _initSocketListener();
  }

  void _initSocketListener() {
    SocketService.onLeaveStatusUpdated = (data) {
      debugPrint('Socket event received: leave status updated');
      fetchMyLeaves();
      fetchBalances();
    };
  }

  // Fetch my leaves
  Future<void> fetchMyLeaves({String? userId, String? orgId}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final queryParams = <String, dynamic>{};
      if (userId != null) queryParams['userId'] = userId;
      if (orgId != null) queryParams['orgId'] = orgId;

      final response = await ApiService.client.get(
        '/leave/my',
        queryParameters: queryParams,
      );
      if (response.data['success'] == true) {
        final list = response.data['data']['leaves'] as List? ?? [];
        _leaves = list.map((item) => LeaveModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to load leaves';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Fetch balances
  Future<void> fetchBalances() async {
    try {
      final response = await ApiService.client.get('/leave/balance');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        _balances = list.map((item) => LeaveBalanceModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } catch (e) {
      // Catch silently
    }
    notifyListeners();
  }

  // Apply Leave
  Future<bool> applyLeave({
    required String leaveType,
    required DateTime startDate,
    required DateTime endDate,
    required String reason,
    String? attachmentBase64,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final payload = {
        'type': leaveType,
        'startDate': startDate.toIso8601String().substring(0, 10),
        'endDate': endDate.toIso8601String().substring(0, 10),
        'reason': reason,
      };
      if (attachmentBase64 != null) {
        payload['attachmentBase64'] = attachmentBase64;
      }

      final response = await ApiService.client.post(
        '/leave/apply',
        data: payload,
      );

      if (response.data['success'] == true) {
        await fetchMyLeaves();
        await fetchBalances();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to submit leave request';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  // Cancel Leave
  Future<bool> cancelLeave(String leaveId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.delete('/leave/$leaveId');
      if (response.data['success'] == true) {
        await fetchMyLeaves();
        await fetchBalances();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to cancel leave request';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }
}
