import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../core/utils/storage_helper.dart';

/// `ApiService` acts as the central HTTP gateway for the mobile app.
/// It uses `Dio` and implements an advanced token-rotation architecture:
/// If an access token expires (401), the interceptor silently captures the failure, 
/// hits the `/auth/refresh` endpoint with the secure refresh token, and replays the 
/// original request with zero UI interruption.
class ApiService {
  static late Dio _dio;
  static bool _isInitialized = false;

  static Dio get client => _dio;

  static Future<void> initialize() async {
    if (_isInitialized) return;

    await StorageHelper.initialize();
    
    // Load environment variables
    try {
      await dotenv.load(fileName: '.env');
    } catch (e) {
      // Fallback if dotenv file fails to load (common in background isolates)
    }

    String? envBaseUrl = dotenv.env['API_BASE_URL'];
    if (envBaseUrl != null) {
      await StorageHelper.saveApiBaseUrl(envBaseUrl);
    } else {
      envBaseUrl = StorageHelper.getApiBaseUrl();
    }
    final String baseUrl = envBaseUrl ?? 'http://localhost:5000/api/v1';

    final gpsEndpoint = dotenv.env['GPS_TRACKING_ENDPOINT'];
    if (gpsEndpoint != null) {
      await StorageHelper.saveGpsTrackingEndpoint(gpsEndpoint);
    }

    _dio = Dio(
      BaseOptions(
        baseUrl: baseUrl,
        connectTimeout: const Duration(seconds: 30),
        receiveTimeout: const Duration(seconds: 60),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    // -------------------------------------------------------------
    // JWT Security Interceptor
    // -------------------------------------------------------------
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          // Dynamically inject the hardware-encrypted JWT into every request
          final accessToken = await StorageHelper.getAccessToken();
          if (accessToken != null) {
            options.headers['Authorization'] = 'Bearer $accessToken';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Automatic Token Rotation Flow (401 Unauthorized)
          // If token expired (401) and we have a refresh token, try refreshing
          if (error.response?.statusCode == 401 &&
              error.requestOptions.path != '/auth/login' &&
              error.requestOptions.path != '/auth/refresh') {
            
            final refreshToken = await StorageHelper.getRefreshToken();
            if (refreshToken != null) {
              try {
                // Request new tokens using refresh endpoint
                final refreshResponse = await Dio(BaseOptions(baseUrl: baseUrl)).post(
                  '/auth/refresh',
                  data: {'refreshToken': refreshToken},
                );

                if (refreshResponse.statusCode == 200 && refreshResponse.data['success'] == true) {
                  final data = refreshResponse.data['data'];
                  final newAccess = data['accessToken'] as String;
                  final newRefresh = data['refreshToken'] as String;

                  // Save tokens
                  await StorageHelper.saveAccessToken(newAccess);
                  await StorageHelper.saveRefreshToken(newRefresh);

                  // Retry original request with new access token
                  final options = error.requestOptions;
                  options.headers['Authorization'] = 'Bearer $newAccess';
                  
                  final response = await _dio.fetch(options);
                  return handler.resolve(response);
                }
              } catch (e) {
                // Refresh failed: Logout and clear
                await StorageHelper.clearAll();
              }
            }
          }
          return handler.next(error);
        },
      ),
    );

    _isInitialized = true;
  }
}
