import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../models/attendance_model.dart';
import '../core/utils/storage_helper.dart';

// Renamed from Check In/Out to Punch In/Out as per v2 spec
class AttendanceProvider extends ChangeNotifier {
  AttendanceModel? _todayAttendance;
  List<AttendanceModel> _attendanceHistory = [];
  List<AttendanceModel> _todaySessions = [];
  bool _isLoading = false;
  String? _errorMessage;

  AttendanceModel? get todayAttendance => _todayAttendance;
  List<AttendanceModel> get attendanceHistory => _attendanceHistory;
  List<AttendanceModel> get todaySessions => _todaySessions;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  // Renamed from Check In/Out to Punch In/Out as per v2 spec
  bool get isPunchedIn => _todayAttendance != null && _todayAttendance!.punchOutTime == null;
  bool get isDayComplete => _todaySessions.length >= 2 && _todaySessions.every((m) => m.punchOutTime != null);

  // Punch In handler (renamed from checkIn as per v2 spec)
  Future<bool> punchIn(Position position, {String? selfieBase64}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await ApiService.client.post(
        '/attendance/check-in',
        data: {
          'latitude': position.latitude,
          'longitude': position.longitude,
          if (selfieBase64 != null) 'selfieBase64': selfieBase64,
        },
      );

      if (response.data['success'] == true) {
        _todayAttendance = AttendanceModel.fromJson(response.data['data']);
        await fetchTodayState();
        await fetchHistory();
        
        // Start background location tracking upon punch-in
        final sessionNum = _todayAttendance?.sessionNumber ?? 1;
        await StorageHelper.setTrackingActive(true);
        await LocationService().startTracking(shiftStatus: 'Session $sessionNum Active');
        
        return true;
      }
    } on DioException catch (e) {
      _errorMessage = e.response?.data?['error']?['message'] ?? 'Punch In failed';
    } catch (e) {
      _errorMessage = 'An error occurred: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
    return false;
  }

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
      // Catch silently
    }
    notifyListeners();
  }

  // Fetch personal history
  Future<void> fetchHistory() async {
    try {
      final response = await ApiService.client.get('/attendance');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        _attendanceHistory = list
            .map((item) => AttendanceModel.fromJson(item as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      // Catch silently
    }
    notifyListeners();
  }
}
