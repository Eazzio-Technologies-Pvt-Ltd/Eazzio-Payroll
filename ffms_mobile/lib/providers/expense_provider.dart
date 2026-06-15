import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/expense_model.dart';
import '../services/socket_service.dart';

class ExpenseProvider extends ChangeNotifier {
  List<ExpenseModel> _expenses = [];
  bool _isLoading = false;
  String? _errorMessage;

  List<ExpenseModel> get expenses => _expenses;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  ExpenseProvider() {
    _initSocketListener();
  }

  void _initSocketListener() {
    SocketService.onExpenseStatusUpdated = (data) {
      debugPrint('Socket event received: expense status updated');
      fetchMyExpenses();
    };
  }

  // Fetch my expenses
  Future<void> fetchMyExpenses() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.get('/expenses/my');
      if (response.data['success'] == true) {
        final list = response.data['data']['expenses'] as List? ?? [];
        _expenses = list.map((item) => ExpenseModel.fromJson(item as Map<String, dynamic>)).toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to load expenses';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // Create or Submit Expense Claim
  Future<bool> createExpense({
    required String title,
    required double amount,
    required String category,
    required DateTime date,
    String? description,
    File? receipt,
    bool submitDirectly = false,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      String backendCategory = category.toUpperCase();
      if (backendCategory == 'LODGING') {
        backendCategory = 'ACCOMMODATION';
      }

      final cleanTitle = title.trim();
      final cleanDesc = description?.trim() ?? '';
      final backendDescription = cleanDesc.isNotEmpty ? '$cleanTitle - $cleanDesc' : cleanTitle;

      final Map<String, dynamic> payload = {
        'category': backendCategory,
        'amount': amount,
        'date': date.toIso8601String().substring(0, 10),
        'description': backendDescription,
      };

      if (receipt != null) {
        final bytes = await receipt.readAsBytes();
        final base64String = base64Encode(bytes);
        payload['receiptBase64'] = 'data:image/jpeg;base64,$base64String';
      }

      // 1. Create the expense (creates as DRAFT)
      var response = await ApiService.client.post('/expenses', data: payload);

      if (response.data['success'] == true) {
        final createdExpense = ExpenseModel.fromJson(response.data['data']);

        // 2. Submit if requested
        if (submitDirectly) {
          final submitResponse = await ApiService.client.put('/expenses/${createdExpense.id}/submit');
          if (submitResponse.data['success'] != true) {
            _errorMessage = 'Expense saved as draft, but submission failed.';
            await fetchMyExpenses();
            return false;
          }
        }
        await fetchMyExpenses();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to submit expense';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

  // Submit existing draft expense
  Future<bool> submitExpense(String expenseId) async {
    try {
      final response = await ApiService.client.put('/expenses/$expenseId/submit');
      if (response.data['success'] == true) {
        await fetchMyExpenses();
        return true;
      }
    } catch (e) {
      // Catch
    }
    return false;
  }

  // Fetch single expense by ID
  Future<ExpenseModel?> getExpenseById(String id) async {
    try {
      final response = await ApiService.client.get('/expenses/$id');
      if (response.data['success'] == true) {
        return ExpenseModel.fromJson(response.data['data']);
      }
    } catch (e) {
      debugPrint('Error fetching expense by id: $e');
    }
    return null;
  }

  // Cache and lookup manager name to avoid redundant API queries
  final Map<String, String> _managerNameCache = {};

  Future<String> getManagerName(String managerId) async {
    if (managerId.isEmpty) return 'Manager';
    if (_managerNameCache.containsKey(managerId)) {
      return _managerNameCache[managerId]!;
    }
    try {
      final response = await ApiService.client.get('/users/$managerId');
      final name = response.data['data']?['name'] ?? response.data['data']?['fullName'] ?? 'Manager';
      _managerNameCache[managerId] = name;
      return name;
    } catch (e) {
      return 'Manager'; // fallback - never show raw ID
    }
  }
}
