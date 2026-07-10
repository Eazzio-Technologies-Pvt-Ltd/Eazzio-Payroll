// UI/UX v2 — modern premium design — Antigravity 2026
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import '../providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/responsive.dart';

class PermissionStep {
  final String title;
  final String explanation;
  final IconData icon;
  final bool isGranted;
  final VoidCallback onGrant;

  PermissionStep({
    required this.title,
    required this.explanation,
    required this.icon,
    required this.isGranted,
    required this.onGrant,
  });
}

class PermissionsScreen extends StatefulWidget {
  final VoidCallback? onPermissionsGranted;

  const PermissionsScreen({super.key, this.onPermissionsGranted});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> with WidgetsBindingObserver {
  // Track status of permissions
  bool _locGranted = false;
  bool _cameraGranted = false;
  bool _photosGranted = false;
  bool _bluetoothGranted = false;
  bool _notificationsGranted = false;
  bool _activityGranted = false;
  bool _powerGranted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissions(isInit: true);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      _checkPermissions();
    }
  }

  /// Verifies current status of all permissions
  Future<void> _checkPermissions({bool isInit = false}) async {
    try {
      bool locStatusAlways = false;
      bool locStatusInUse = false;
      bool cameraStatus = false;
      bool photosStatus = false;
      bool notificationsStatus = false;

      if (!kIsWeb) {
        locStatusAlways = await Permission.locationAlways.isGranted;
        locStatusInUse = await Permission.location.isGranted;
        cameraStatus = await Permission.camera.isGranted;
        photosStatus = await Permission.photos.isGranted || await Permission.storage.isGranted;
        notificationsStatus = await Permission.notification.isGranted;
      } else {
        locStatusAlways = true;
        locStatusInUse = true;
        cameraStatus = true;
        photosStatus = true;
        notificationsStatus = true;
      }
      
      bool bluetoothStatus = false;
      if (!kIsWeb) {
        try {
          bluetoothStatus = await Permission.bluetooth.isGranted;
        } catch (_) {
          bluetoothStatus = true;
        }
      } else {
        bluetoothStatus = true;
      }
      
      bool activityStatus = false;
      if (!kIsWeb) {
        if (Platform.isAndroid) {
          activityStatus = await Permission.activityRecognition.isGranted;
        } else if (Platform.isIOS) {
          activityStatus = await Permission.sensors.isGranted;
        }
      } else {
        activityStatus = true;
      }

      bool powerStatus = true;
      if (!kIsWeb && Platform.isAndroid) {
        try {
          powerStatus = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
        } catch (_) {
          powerStatus = true;
        }
      }

      final newLoc = locStatusAlways || locStatusInUse;

      // Trigger light haptic if any permission was newly granted (not on first init load)
      if (!isInit) {
        bool newlyGranted = (newLoc && !_locGranted) ||
            (cameraStatus && !_cameraGranted) ||
            (photosStatus && !_photosGranted) ||
            (notificationsStatus && !_notificationsGranted) ||
            (activityStatus && !_activityGranted) ||
            (powerStatus && !_powerGranted);
        if (newlyGranted) {
          HapticFeedback.lightImpact();
        }
      }

      if (mounted) {
        setState(() {
          _locGranted = newLoc;
          _cameraGranted = cameraStatus;
          _photosGranted = photosStatus;
          _bluetoothGranted = bluetoothStatus;
          _notificationsGranted = notificationsStatus;
          _activityGranted = activityStatus;
          _powerGranted = powerStatus;
        });
      }
    } catch (e) {
      debugPrint('Error checking device permissions: $e');
      // On error, apply safe fallbacks to prevent the screen from remaining blank/hanging
      if (mounted) {
        setState(() {
          _locGranted = _locGranted;
          _cameraGranted = _cameraGranted;
          _photosGranted = _photosGranted;
          _bluetoothGranted = _bluetoothGranted;
          _notificationsGranted = _notificationsGranted;
          _activityGranted = _activityGranted;
          _powerGranted = _powerGranted;
        });
      }
    }
  }

  /// Location: Always / When in Use
  Future<void> _grantLocation() async {
    if (kIsWeb) {
      await _checkPermissions();
      return;
    }
    var status = await Permission.location.request();
    if (status.isGranted) {
      await Permission.locationAlways.request();
    }
    await _checkPermissions();
  }

  /// Camera Access
  Future<void> _grantCamera() async {
    if (kIsWeb) {
      await _checkPermissions();
      return;
    }
    await Permission.camera.request();
    await _checkPermissions();
  }

  /// Photo Library / Storage
  Future<void> _grantPhotos() async {
    if (kIsWeb) {
      await _checkPermissions();
      return;
    }
    await Permission.photos.request();
    await Permission.storage.request();
    await _checkPermissions();
  }

  /// Bluetooth Connectivity
  Future<void> _grantBluetooth() async {
    if (kIsWeb) {
      setState(() {
        _bluetoothGranted = true;
      });
      await _checkPermissions();
      return;
    }
    try {
      final status = await Permission.bluetooth.request();
      if (status.isRestricted || status.isPermanentlyDenied) {
        setState(() {
          _bluetoothGranted = true;
        });
      }
    } catch (_) {
      setState(() {
        _bluetoothGranted = true;
      });
    }
    await _checkPermissions();
  }

  /// Push Notifications
  Future<void> _grantNotifications() async {
    if (kIsWeb) {
      await _checkPermissions();
      return;
    }
    await Permission.notification.request();
    await _checkPermissions();
  }

  /// Helper getter to determine if all required permissions are satisfied
  bool get _allGranted =>
      _locGranted &&
      _cameraGranted &&
      _photosGranted &&
      _notificationsGranted &&
      _activityGranted &&
      _powerGranted;

  /// Handles auto-requesting all missing permissions sequentially
  Future<void> _grantAllMissingPermissions() async {
    if (!_locGranted) await _grantLocation();
    if (!_cameraGranted) await _grantCamera();
    if (!_photosGranted) await _grantPhotos();
    if (!_bluetoothGranted) await _grantBluetooth();
    if (!_notificationsGranted) await _grantNotifications();
    if (!_activityGranted) await _grantActivity();
    if (!_powerGranted) await _grantPower();
  }

  /// Physical Activity / Motion Tracking
  Future<void> _grantActivity() async {
    if (!kIsWeb) {
      if (Platform.isAndroid) {
        await Permission.activityRecognition.request();
      } else if (Platform.isIOS) {
        await Permission.sensors.request();
      }
    }
    await _checkPermissions();
  }

  /// Power / Auto Launch settings
  static const _channel = MethodChannel('com.eazzio.payroll/device_settings');

  Future<void> _grantPower() async {
    if (!kIsWeb && Platform.isAndroid) {
      final isIgnoringBattery = await FlutterForegroundTask.isIgnoringBatteryOptimizations;
      if (!isIgnoringBattery) {
        await FlutterForegroundTask.requestIgnoreBatteryOptimization();
      }
      try {
        await _channel.invokeMethod('openAutostartSettings');
      } catch (e) {
        debugPrint('Failed to open autostart settings: $e');
      }
    }
    await _checkPermissions();
  }

  /// Save flag in SharedPreferences and continue to next screen
  void _handleContinue() async {
    if (!_allGranted) {
      await _grantAllMissingPermissions();
      if (!_allGranted) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please grant all required permissions to continue.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }
    }

    await StorageHelper.setPermissionsGranted(true);

    if (widget.onPermissionsGranted != null) {
      widget.onPermissionsGranted!();
    } else {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.checkAuthStatus();
      if (!mounted) return;
      if (authProvider.isAuthenticated) {
        Navigator.pushReplacementNamed(context, '/home');
      } else {
        Navigator.pushReplacementNamed(context, '/login');
      }
    }
  }

  int get _currentStepIndex {
    if (!_locGranted) return 0;
    if (!_cameraGranted) return 1;
    if (!_photosGranted) return 2;
    if (!_activityGranted) return 3;
    if (!kIsWeb && Platform.isAndroid && !_powerGranted) return 4;
    if (!_notificationsGranted) return 5;
    return 6;
  }

  Widget _buildPermissionItem({
    required IconData icon,
    required String title,
    required String explanation,
    required bool isGranted,
    required bool isActiveStep,
    required VoidCallback onGrant,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isActiveStep 
              ? AppColors.primary.withValues(alpha: 0.4) 
              : AppColors.outlineVariant, 
          width: isActiveStep ? 1.5 : 0.8,
        ),
        boxShadow: isActiveStep ? [
          BoxShadow(
            color: AppColors.primary.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ] : null,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: isGranted
                  ? AppColors.secondary.withValues(alpha: 0.1)
                  : AppColors.primary.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isGranted ? AppColors.secondary : AppColors.primary,
              size: 22,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontFamily: 'Plus Jakarta Sans',
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: AppColors.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  explanation,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.onSurfaceVariant,
                    height: 1.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          isGranted
              ? const Icon(Icons.check_circle, color: AppColors.secondary, size: 22)
              : Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: AppColors.outline,
                    shape: BoxShape.circle,
                  ),
                ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final List<PermissionStep> steps = [
      PermissionStep(
        title: 'Location (Always)',
        explanation: 'Needed for GPS tracking and distance calculation',
        icon: Icons.my_location,
        isGranted: _locGranted,
        onGrant: _grantLocation,
      ),
      PermissionStep(
        title: 'Camera Access',
        explanation: 'Needed to upload odometer photos and task proof',
        icon: Icons.camera_alt,
        isGranted: _cameraGranted,
        onGrant: _grantCamera,
      ),
      PermissionStep(
        title: 'Photo Library',
        explanation: 'Needed to select images from your gallery',
        icon: Icons.photo_library,
        isGranted: _photosGranted,
        onGrant: _grantPhotos,
      ),
      PermissionStep(
        title: 'Physical Activity',
        explanation: 'Needed to optimize tracking and detect motion states',
        icon: Icons.directions_run,
        isGranted: _activityGranted,
        onGrant: _grantActivity,
      ),
      if (!kIsWeb && Platform.isAndroid)
        PermissionStep(
          title: 'Power Optimization',
          explanation: 'Needed to bypass battery saver and auto-start on reboot',
          icon: Icons.battery_saver,
          isGranted: _powerGranted,
          onGrant: _grantPower,
        ),
      PermissionStep(
        title: 'Notifications',
        explanation: 'Needed to receive task alerts and updates',
        icon: Icons.notifications,
        isGranted: _notificationsGranted,
        onGrant: _grantNotifications,
      ),
    ];

    final currentStep = _currentStepIndex;

    final r = Responsive(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: r.maxContentWidth),
          child: Stack(
            children: [
          // Decorative top-right gradient blob
          Positioned(
            top: -100,
            right: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.08),
                shape: BoxShape.circle,
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 80, sigmaY: 80),
                child: Container(color: Colors.transparent),
              ),
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 12),
                  const Center(
                    child: Icon(
                      Icons.shield_outlined,
                      size: 56,
                      color: AppColors.primary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Setup Permissions',
                    style: TextStyle(
                      fontFamily: 'Plus Jakarta Sans',
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.onSurface,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'To begin tracking your shifts, resolving client visits, and managing your tasks, please configure the required permissions.',
                    style: TextStyle(
                      fontSize: 13,
                      color: AppColors.onSurfaceVariant,
                      height: 1.4,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),

                  // Progress Step dots
                  if (!_allGranted && currentStep < steps.length) ...[
                    Text(
                      'Step ${currentStep + 1} of ${steps.length}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                        letterSpacing: 0.5,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: List.generate(steps.length, (index) {
                        final isActive = index == currentStep;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                          width: isActive ? 16 : 8,
                          height: 8,
                          decoration: BoxDecoration(
                            color: isActive ? AppColors.primary : AppColors.outlineVariant,
                            borderRadius: BorderRadius.circular(4),
                          ),
                        );
                      }),
                    ),
                    const SizedBox(height: 20),
                  ],

                  Expanded(
                    child: ListView.builder(
                      physics: const BouncingScrollPhysics(),
                      itemCount: steps.length,
                      itemBuilder: (context, index) {
                        final step = steps[index];
                        return _buildPermissionItem(
                          icon: step.icon,
                          title: step.title,
                          explanation: step.explanation,
                          isGranted: step.isGranted,
                          isActiveStep: index == currentStep,
                          onGrant: step.onGrant,
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),
                  
                  // Grant/Continue Button
                  Container(
                    width: double.infinity,
                    height: 54,
                    decoration: BoxDecoration(
                      gradient: _allGranted
                          ? const LinearGradient(
                              colors: [AppColors.secondary, Color(0xFF16A34A)],
                            )
                          : LinearGradient(
                              colors: [
                                  AppColors.primary,
                                  AppColors.primary.withValues(alpha: 0.8),
                              ],
                            ),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      onPressed: _allGranted 
                          ? _handleContinue 
                          : () {
                              if (currentStep < steps.length) {
                                steps[currentStep].onGrant();
                              }
                            },
                      child: Text(
                        _allGranted ? 'Continue' : 'Grant ${steps[currentStep].title}',
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),

                  // Skip Button if not all granted
                  if (!_allGranted) ...[
                    const SizedBox(height: 8),
                    Center(
                      child: TextButton(
                        onPressed: _handleContinue,
                        child: const Text(
                          'Skip for now',
                          style: TextStyle(
                            color: AppColors.onSurfaceVariant,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                ],
              ),
            ),
          ),
        ],
      ),
    ),
      ),
    );
  }
}
