import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:permission_handler/permission_handler.dart';
import '../core/utils/offline_cache.dart';
import '../core/utils/offline_telemetry_cache.dart';
import '../core/utils/storage_helper.dart';
import 'api_service.dart';

/// `LocationService` is a Singleton that manages high-precision GPS tracking for Field Agents.
class LocationService {
  static final LocationService _instance = LocationService._internal();
  factory LocationService() => _instance;
  LocationService._internal();

  StreamSubscription<Position>? _positionStreamSubscription;
  Timer? _stopTimer;
  bool _isTracking = false;
  Position? _lastPosition;
  
  // Stream controller to notify UI elements of location updates
  final StreamController<Position> _locationStreamController = StreamController<Position>.broadcast();

  bool get isTracking => _isTracking;
  Position? get lastPosition => _lastPosition;
  Stream<Position> get onLocationChanged => _locationStreamController.stream;

  // Request permissions
  Future<bool> requestPermission() async {
    bool serviceEnabled;
    LocationPermission permission;

    serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    // Request Activity Recognition / Sensors permission for motion tracking
    if (!kIsWeb) {
      if (Platform.isAndroid) {
        if (await Permission.activityRecognition.isDenied) {
          await Permission.activityRecognition.request();
        }
      } else if (Platform.isIOS) {
        if (await Permission.sensors.isDenied) {
          await Permission.sensors.request();
        }
      }
    }

    // Request battery optimization exclusion to allow background activity by default
    if (!kIsWeb && Platform.isAndroid) {
      final isIgnoringBattery = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
      if (!isIgnoringBattery) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
    }

    return true;
  }

  void _onReceiveTaskData(Object data) {
    if (data is Map<Object?, Object?>) {
      final map = data.cast<String, dynamic>();
      final position = Position(
        latitude: map['latitude'] as double,
        longitude: map['longitude'] as double,
        timestamp: DateTime.parse(map['timestamp'] as String),
        accuracy: map['accuracy'] as double,
        altitude: map['altitude'] as double,
        altitudeAccuracy: map['altitudeAccuracy'] as double,
        heading: map['heading'] as double,
        headingAccuracy: map['headingAccuracy'] as double,
        speed: map['speed'] as double,
        speedAccuracy: map['speedAccuracy'] as double,
      );
      _lastPosition = position;
      _locationStreamController.add(position);
    }
  }

  // Start background or active tracking
  Future<bool> startTracking({String? shiftStatus, Function(Position)? onLocationUpdated}) async {
    if (_isTracking) return true;

    final hasPermission = await requestPermission();
    if (!hasPermission) return false;

    _isTracking = true;

    if (!kIsWeb && Platform.isAndroid) {
      // Register callback to receive updates from task handler
      FlutterForegroundTask.addTaskDataCallback(_onReceiveTaskData);

      // Start the foreground service
      await startForegroundTask(shiftStatus ?? 'ACTIVE');
    } else {
      // Non-Android platforms (iOS, Web) run in the main isolate
      _startLocalGpsStream(onLocationUpdated);
    }

    return true;
  }

  // Stop tracking
  Future<void> stopTracking() async {
    if (!_isTracking) return;

    if (!kIsWeb && Platform.isAndroid) {
      await stopForegroundTask();
      FlutterForegroundTask.removeTaskDataCallback(_onReceiveTaskData);
    } else {
      await _positionStreamSubscription?.cancel();
      _stopTimer?.cancel();
    }

    _lastPosition = null;
    _isTracking = false;
  }

  void _startLocalGpsStream(Function(Position)? onLocationUpdated) {
    LocationSettings locationSettings = const LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 10,
    );

    if (!kIsWeb && Platform.isIOS) {
      locationSettings = AppleSettings(
        accuracy: LocationAccuracy.best,
        activityType: ActivityType.fitness,
        distanceFilter: 10,
        pauseLocationUpdatesAutomatically: false,
        showBackgroundLocationIndicator: true,
      );
    }

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) {
      _lastPosition = position;
      _locationStreamController.add(position);
      if (onLocationUpdated != null) {
        onLocationUpdated(position);
      }

      if (position.speed < 0.5) {
        if (_stopTimer == null || !_stopTimer!.isActive) {
          _stopTimer = Timer(const Duration(seconds: 30), () {
            _pingServerLocal(position, isStopPoint: true);
          });
        }
      } else {
        _stopTimer?.cancel();
      }

      _pingServerLocal(position);
    });
  }

  Future<void> _pingServerLocal(Position position, {bool isStopPoint = false}) async {
    final battery = Battery();
    final batteryLevel = await battery.batteryLevel;

    final currentPing = {
      'latitude': position.latitude,
      'longitude': position.longitude,
      'accuracy': position.accuracy,
      'speed': position.speed,
      'isMoving': !isStopPoint && position.speed > 0.5,
      'isStopPoint': isStopPoint,
      'batteryLevel': batteryLevel,
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
    };

    try {
      final cachedPings = await OfflineLocationCache.getAllLocations();
      final allPings = [...cachedPings, currentPing];

      const int chunkSize = 50;
      for (var i = 0; i < allPings.length; i += chunkSize) {
        final chunk = allPings.sublist(i, i + chunkSize > allPings.length ? allPings.length : i + chunkSize);
        await ApiService.client.post(
          '/location/batch',
          data: {
            'locations': chunk
          },
        );
      }
      
      if (cachedPings.isNotEmpty) {
        await OfflineLocationCache.clearLocations();
      }

      await ApiService.client.post(
        '/geofence/ping',
        data: currentPing,
      );
    } catch (e) {
      await OfflineLocationCache.saveLocation(currentPing);
    }
  }

  // ----------------------------------------------------------------
  // FOREGROUND SERVICE CONTROL METHODS (Android only)
  // ----------------------------------------------------------------
  static void initForegroundTask() {
    FlutterForegroundTask.init(
      androidNotificationOptions: AndroidNotificationOptions(
        channelId: 'eazziopayroll_location',
        channelName: 'Eazzio Payroll Location Tracking',
        channelDescription: 'Keeps GPS active while you are on duty.',
        channelImportance: NotificationChannelImportance.LOW,
        priority: NotificationPriority.LOW,
      ),
      iosNotificationOptions: const IOSNotificationOptions(
        showNotification: true,
        playSound: false,
      ),
      foregroundTaskOptions: ForegroundTaskOptions(
        eventAction: ForegroundTaskEventAction.repeat(300000), // 300,000 ms = 5 minutes periodic interval
        autoRunOnBoot: true,
        allowWakeLock: true,
        allowWifiLock: true,
      ),
    );
  }

  static Future<void> startForegroundTask(String shiftStatus) async {
    if (await FlutterForegroundTask.isRunningService) return;

    await FlutterForegroundTask.startService(
      notificationTitle: 'Eazzio Payroll — On Duty',
      notificationText: 'Tracking your location. Status: $shiftStatus',
      callback: startLocationCallback,
    );
  }

  static Future<void> stopForegroundTask() async {
    await FlutterForegroundTask.stopService();
  }

  static Future<void> updateNotification(String shiftStatus) async {
    await FlutterForegroundTask.updateService(
      notificationTitle: 'Eazzio Payroll — On Duty',
      notificationText: 'Tracking your location. Status: $shiftStatus',
    );
  }
}

// Top-level callback — must be a top-level function, not a class method
@pragma('vm:entry-point')
void startLocationCallback() {
  FlutterForegroundTask.setTaskHandler(LocationTaskHandler());
}

class LocationTaskHandler extends TaskHandler {
  StreamSubscription<Position>? _positionStreamSubscription;
  Timer? _stopTimer;

  @override
  Future<void> onStart(DateTime timestamp, TaskStarter starter) async {
    await ApiService.initialize();
    _startGpsStream();
  }

  @override
  void onRepeatEvent(DateTime timestamp) {
    _collectAndSendTelemetry();
  }

  Future<void> _collectAndSendTelemetry() async {
    try {
      // 1. GPS coordinates — from location plugin
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );

      // 2. Battery level and charging status — from battery_plus plugin
      final battery = Battery();
      final batteryLevel = await battery.batteryLevel;
      final batteryState = await battery.batteryState;
      final isCharging = batteryState == BatteryState.charging;

      // 3. Phone model and brand — from device_info_plus plugin
      final deviceInfo = DeviceInfoPlugin();
      String phoneModel = 'Unknown';
      String phoneBrand = 'Unknown';
      if (Platform.isAndroid) {
        final androidInfo = await deviceInfo.androidInfo;
        phoneModel = androidInfo.model;
        phoneBrand = androidInfo.brand;
      } else if (Platform.isIOS) {
        final iosInfo = await deviceInfo.iosInfo;
        phoneModel = iosInfo.model;
        phoneBrand = 'Apple';
      }

      // 4. Location enabled status — from location service check
      final locationEnabled = await Geolocator.isLocationServiceEnabled();

      final List<ConnectivityResult> connectivityResult = await Connectivity().checkConnectivity();
      final wifiEnabled = connectivityResult.contains(ConnectivityResult.wifi);

      // 6. Bluetooth status — from permission_handler
      final bluetoothStatus = await Permission.bluetooth.status;
      final bluetoothStatusStr = bluetoothStatus.toString().split('.').last;

      // 7. Timestamp — use DateTime.now().toUtc().toIso8601String()
      final recordedAt = DateTime.now().toUtc().toIso8601String();

      // 8. User ID — from logged-in user session/storage
      final userId = StorageHelper.getUserId() ?? 'unknown-user';

      // All values are real device data — nothing hardcoded
      final payload = {
        'userId': userId,
        'latitude': position.latitude,
        'longitude': position.longitude,
        'accuracy': position.accuracy,
        'speed': position.speed,
        'heading': position.heading,
        'altitude': position.altitude,
        'batteryLevel': batteryLevel,
        'isCharging': isCharging,
        'phoneModel': phoneModel,
        'phoneBrand': phoneBrand,
        'locationEnabled': locationEnabled,
        'wifiEnabled': wifiEnabled,
        'bluetoothStatus': bluetoothStatusStr,
        'recordedAt': recordedAt,
      };

      await _sendTelemetryPayload(payload);
    } catch (e) {
      debugPrint('[LocationTaskHandler] Failed to collect background telemetry data: $e');
    }
  }

  Future<void> _sendTelemetryPayload(Map<String, dynamic> payload) async {
    // Read GPS tracking endpoint from storage/dotenv config - not hardcoded
    final gpsEndpoint = StorageHelper.getGpsTrackingEndpoint() ?? dotenv.env['GPS_TRACKING_ENDPOINT'] ?? '/geofence/ping';

    try {
      final response = await ApiService.client.post(
        gpsEndpoint,
        data: payload,
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        // Telemetry payload sent successfully. Retry all queued payloads automatically on next successful network connection
        await _retryQueuedTelemetry();
      } else {
        await OfflineTelemetryCache.saveTelemetry(payload);
      }
    } catch (e) {
      // Failed payloads are queued locally and retried on reconnect
      await OfflineTelemetryCache.saveTelemetry(payload);
    }
  }

  Future<void> _retryQueuedTelemetry() async {
    final queued = await OfflineTelemetryCache.getAllTelemetry();
    if (queued.isEmpty) return;

    final gpsEndpoint = StorageHelper.getGpsTrackingEndpoint() ?? dotenv.env['GPS_TRACKING_ENDPOINT'] ?? '/geofence/ping';
    List<Map<String, dynamic>> failedAgain = [];

    for (final payload in queued) {
      try {
        final response = await ApiService.client.post(
          gpsEndpoint,
          data: payload,
        );
        if (response.statusCode != 200 && response.statusCode != 201) {
          failedAgain.add(payload);
        }
      } catch (e) {
        failedAgain.add(payload);
      }
    }

    await OfflineTelemetryCache.clearTelemetry();
    if (failedAgain.isNotEmpty) {
      for (final fail in failedAgain) {
        await OfflineTelemetryCache.saveTelemetry(fail);
      }
    }
  }

  @override
  Future<void> onDestroy(DateTime timestamp) async {
    await _stopGpsStream();
  }

  void _startGpsStream() {
    LocationSettings locationSettings = const LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 10,
    );

    if (Platform.isAndroid) {
      locationSettings = AndroidSettings(
        accuracy: LocationAccuracy.best,
        distanceFilter: 10,
        forceLocationManager: true,
        intervalDuration: const Duration(seconds: 5),
      );
    }

    _positionStreamSubscription = Geolocator.getPositionStream(
      locationSettings: locationSettings,
    ).listen((Position position) async {
      // Send location update to the main isolate
      FlutterForegroundTask.sendDataToMain({
        'latitude': position.latitude,
        'longitude': position.longitude,
        'timestamp': position.timestamp.toIso8601String(),
        'accuracy': position.accuracy,
        'altitude': position.altitude,
        'altitudeAccuracy': position.altitudeAccuracy,
        'heading': position.heading,
        'headingAccuracy': position.headingAccuracy,
        'speed': position.speed,
        'speedAccuracy': position.speedAccuracy,
      });
      
      if (position.speed < 0.5) {
        if (_stopTimer == null || !_stopTimer!.isActive) {
          _stopTimer = Timer(const Duration(seconds: 30), () async {
            await _pingServer(position, isStopPoint: true);
          });
        }
      } else {
        _stopTimer?.cancel();
      }

      await _pingServer(position);
    });
  }

  Future<void> _stopGpsStream() async {
    await _positionStreamSubscription?.cancel();
    _stopTimer?.cancel();
  }

  Future<void> _pingServer(Position position, {bool isStopPoint = false}) async {
    final battery = Battery();
    final batteryLevel = await battery.batteryLevel;

    final currentPing = {
      'latitude': position.latitude,
      'longitude': position.longitude,
      'accuracy': position.accuracy,
      'speed': position.speed,
      'isMoving': !isStopPoint && position.speed > 0.5,
      'isStopPoint': isStopPoint,
      'batteryLevel': batteryLevel,
      'recordedAt': DateTime.now().toUtc().toIso8601String(),
    };

    try {
      final cachedPings = await OfflineLocationCache.getAllLocations();
      final allPings = [...cachedPings, currentPing];

      const int chunkSize = 50;
      for (var i = 0; i < allPings.length; i += chunkSize) {
        final chunk = allPings.sublist(i, i + chunkSize > allPings.length ? allPings.length : i + chunkSize);
        await ApiService.client.post(
          '/location/batch',
          data: {
            'locations': chunk
          },
        );
      }
      
      if (cachedPings.isNotEmpty) {
        await OfflineLocationCache.clearLocations();
      }

      await ApiService.client.post(
        '/geofence/ping',
        data: currentPing,
      );
    } catch (e) {
      await OfflineLocationCache.saveLocation(currentPing);
    }
  }
}
