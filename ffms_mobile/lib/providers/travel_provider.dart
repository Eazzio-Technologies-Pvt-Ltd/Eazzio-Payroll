import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../models/travel_model.dart';

class TravelProvider extends ChangeNotifier {
  TravelLogModel? _todayLog;
  List<TravelLogModel> _history = [];
  AttendanceMonthlySummary? _monthlySummary;
  bool _isLoading = false;
  bool _isSubmitting = false;
  String? _errorMessage;

  TravelLogModel? get todayLog => _todayLog;
  List<TravelLogModel> get history => _history;
  AttendanceMonthlySummary? get monthlySummary => _monthlySummary;
  bool get isLoading => _isLoading;
  bool get isSubmitting => _isSubmitting;
  String? get errorMessage => _errorMessage;

  /// Total distance driven today (KM)
  double get todayDistanceKm => _todayLog?.totalDistanceKm ?? 0.0;

  /// Travel allowance earned today (₹)
  double get todayAllowance => _todayLog?.allowanceAmount ?? 0.0;

  /// Fetch today's travel log from backend
  Future<void> fetchTodayTravel() async {
    try {
      final response = await ApiService.client.get('/travel/my/today');
      if (response.data['success'] == true) {
        final logData = response.data['data']['log'];
        _todayLog = logData != null ? TravelLogModel.fromJson(logData as Map<String, dynamic>) : null;
        notifyListeners();
      }
    } on DioException catch (_) {
      // Silently fail — today log might not exist yet
    } catch (_) {}
  }

  /// Fetch travel history (last N days)
  Future<void> fetchTravelHistory({int limit = 7}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.get('/travel/my', queryParameters: {'limit': limit});
      if (response.data['success'] == true) {
        final data = response.data['data'];
        final logsList = data['logs'] as List? ?? [];
        _history = logsList
            .map((item) => TravelLogModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to load travel history';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch monthly attendance summary
  Future<void> fetchMonthlySummary() async {
    try {
      final response = await ApiService.client.get('/travel/attendance/monthly-summary');
      if (response.data['success'] == true) {
        final summaryData = response.data['data']['summary'];
        _monthlySummary = AttendanceMonthlySummary.fromJson(summaryData as Map<String, dynamic>);
        notifyListeners();
      }
    } on DioException catch (_) {
      // Silently fail
    } catch (_) {}
  }

  /// Submit today's travel meter reading
  Future<bool> submitTravelLog({
    double? meterStart,
    double? meterEnd,
    String? proofImageBase64,
    String? notes,
  }) async {
    _isSubmitting = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.patch(
        '/travel/my/today',
        data: {
          'meterStart': ?meterStart,
          'meterEnd': ?meterEnd,
          'proofImageBase64': ?proofImageBase64,
          if (notes != null && notes.isNotEmpty) 'notes': notes,
        },
      );

      if (response.data['success'] == true) {
        // Refresh travel block after submit so UI reflects latest data
        await fetchTodayTravel();
        await fetchTravelHistory();
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Failed to submit travel log';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isSubmitting = false;
      notifyListeners();
    }
    return false;
  }
}
