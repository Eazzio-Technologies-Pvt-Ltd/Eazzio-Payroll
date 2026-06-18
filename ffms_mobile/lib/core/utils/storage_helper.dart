import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

class StorageHelper {
  static const _secureStorage = FlutterSecureStorage(
    aOptions: AndroidOptions(
      encryptedSharedPreferences: true,
      resetOnError: true,
    ),
  );
  static SharedPreferences? _prefs;

  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userIdKey = 'user_id';
  static const String _userRoleKey = 'user_role';
  static const String _userOrgIdKey = 'user_org_id';
  static const String _userNameKey = 'user_name';
  static const String _userEmailKey = 'user_email';
  static const String _userEmployeeIdKey = 'user_employee_id';
  static const String _pendingActionKey = 'pending_action';

  static Future<void> savePendingAction(String? action) async {
    if (_prefs == null) await initialize();
    if (action != null) {
      await _prefs!.setString(_pendingActionKey, action);
    } else {
      await _prefs!.remove(_pendingActionKey);
    }
  }

  static String? getPendingAction() {
    return _prefs?.getString(_pendingActionKey);
  }

  static Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
  }

  // Tokens (Secure)
  static Future<void> saveAccessToken(String token) async {
    await _secureStorage.write(key: _accessTokenKey, value: token);
  }

  static Future<String?> getAccessToken() async {
    try {
      return await _secureStorage.read(key: _accessTokenKey);
    } catch (e) {
      return null;
    }
  }

  static Future<void> saveRefreshToken(String token) async {
    await _secureStorage.write(key: _refreshTokenKey, value: token);
  }

  static Future<String?> getRefreshToken() async {
    try {
      return await _secureStorage.read(key: _refreshTokenKey);
    } catch (e) {
      return null;
    }
  }

  // User Info (SharedPreferences for fast sync read)
  static Future<void> saveUserInfo({
    required String id,
    required String role,
    required String orgId,
    required String name,
    required String email,
    String? employeeId,
  }) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(_userIdKey, id);
    await _prefs!.setString(_userRoleKey, role);
    await _prefs!.setString(_userOrgIdKey, orgId);
    await _prefs!.setString(_userNameKey, name);
    await _prefs!.setString(_userEmailKey, email);
    if (employeeId != null) {
      await _prefs!.setString(_userEmployeeIdKey, employeeId);
    } else {
      await _prefs!.remove(_userEmployeeIdKey);
    }
  }

  static String? getUserId() => _prefs?.getString(_userIdKey);
  static String? getUserRole() => _prefs?.getString(_userRoleKey);
  static String? getUserOrgId() => _prefs?.getString(_userOrgIdKey);
  static String? getUserName() => _prefs?.getString(_userNameKey);
  static String? getUserEmail() => _prefs?.getString(_userEmailKey);
  static String? getEmployeeId() => _prefs?.getString(_userEmployeeIdKey);

  static const String _userProfileJsonKey = 'user_profile_json';

  static Future<void> saveUserProfileJson(String jsonStr) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(_userProfileJsonKey, jsonStr);
  }

  static String? getUserProfileJson() {
    return _prefs?.getString(_userProfileJsonKey);
  }

  static const String _permissionsGrantedKey = 'permissions_granted';
  static const String _punchInTimeKey = 'punch_in_time';
  static const String _punchOutTimeKey = 'punch_out_time';
  static const String _trackingActiveKey = 'is_tracking_active';

  static Future<void> setPermissionsGranted(bool value) async {
    if (_prefs == null) await initialize();
    await _prefs!.setBool(_permissionsGrantedKey, value);
  }

  static bool hasPermissionsBeenGranted() {
    return _prefs?.getBool(_permissionsGrantedKey) ?? false;
  }

  static Future<void> setTrackingActive(bool value) async {
    if (_prefs == null) await initialize();
    await _prefs!.setBool(_trackingActiveKey, value);
  }

  static bool isTrackingActive() {
    return _prefs?.getBool(_trackingActiveKey) ?? false;
  }

  // Save confirmed punch-in state after server success
  static Future<void> setPunchInState(bool value) async {
    if (_prefs == null) await initialize();
    await _prefs!.setBool('punch_in_active', value);
    // Add comment:
    // // Written ONLY after server confirmation — not optimistically
  }

  static bool getPunchInState() {
    return _prefs?.getBool('punch_in_active') ?? false;
  }

  static Future<void> setPunchInTime(DateTime time) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(
      _punchInTimeKey,
      time.toIso8601String(),
    );
    // Add comment:
    // // Time recorded only after server confirms punch-in
  }

  static DateTime? getPunchInTime() {
    final str = _prefs?.getString(_punchInTimeKey);
    if (str == null) return null;
    return DateTime.tryParse(str);
  }

  static Future<void> clearPunchInState() async {
    if (_prefs == null) await initialize();
    await _prefs!.remove('punch_in_active');
    await _prefs!.remove(_punchInTimeKey);
    // Add comment:
    // // Cleared only on successful punch-out — never during fetch
  }

  static Future<void> savePunchOutTime(String timeStr) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(_punchOutTimeKey, timeStr);
  }

  static String? getPunchOutTime() {
    return _prefs?.getString(_punchOutTimeKey);
  }

  static Future<void> clearPunchOutTime() async {
    if (_prefs == null) await initialize();
    await _prefs!.remove(_punchOutTimeKey);
  }

  static const String _travelMeterStartKey = 'travel_meter_start';

  static Future<void> saveTravelMeterStart(double value) async {
    if (_prefs == null) await initialize();
    await _prefs!.setDouble(_travelMeterStartKey, value);
  }

  static double? getTravelMeterStart() {
    return _prefs?.getDouble(_travelMeterStartKey);
  }

  static Future<void> clearTravelMeterStart() async {
    if (_prefs == null) await initialize();
    await _prefs!.remove(_travelMeterStartKey);
  }

  static const String _apiBaseUrlKey = 'api_base_url';
  static const String _gpsTrackingEndpointKey = 'gps_tracking_endpoint';

  static Future<void> saveApiBaseUrl(String url) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(_apiBaseUrlKey, url);
  }

  static String? getApiBaseUrl() {
    return _prefs?.getString(_apiBaseUrlKey);
  }

  static Future<void> saveGpsTrackingEndpoint(String endpoint) async {
    if (_prefs == null) await initialize();
    await _prefs!.setString(_gpsTrackingEndpointKey, endpoint);
  }

  static String? getGpsTrackingEndpoint() {
    return _prefs?.getString(_gpsTrackingEndpointKey);
  }

  // Clear Storage
  static Future<void> clearAll() async {
    try {
      await _secureStorage.deleteAll();
    } catch (e) {
      // Ignore secure storage deletion error
    }
    if (_prefs == null) await initialize();
    await _prefs!.clear();
  }
}
