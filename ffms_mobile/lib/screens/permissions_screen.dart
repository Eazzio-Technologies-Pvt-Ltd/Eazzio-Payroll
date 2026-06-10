import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import '../widgets/custom_button.dart';
import '../core/utils/storage_helper.dart';

class PermissionsScreen extends StatefulWidget {
  final VoidCallback? onPermissionsGranted;

  const PermissionsScreen({super.key, this.onPermissionsGranted});

  @override
  State<PermissionsScreen> createState() => _PermissionsScreenState();
}

class _PermissionsScreenState extends State<PermissionsScreen> with WidgetsBindingObserver {
  // Track status of the 5 requested permissions
  bool _locGranted = false;
  bool _cameraGranted = false;
  bool _photosGranted = false;
  bool _bluetoothGranted = false;
  bool _notificationsGranted = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _checkPermissions();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Check permissions again if user returns to app after granting them in Settings
    if (state == AppLifecycleState.resumed) {
      _checkPermissions();
    }
  }

  /// Verifies current status of all 5 permissions
  Future<void> _checkPermissions() async {
    final locStatusAlways = await Permission.locationAlways.isGranted;
    final locStatusInUse = await Permission.location.isGranted;
    final cameraStatus = await Permission.camera.isGranted;
    
    // Check photo/storage status (support compatibility on different OS/Android APIs)
    final photosStatus = await Permission.photos.isGranted || await Permission.storage.isGranted;
    
    bool bluetoothStatus = false;
    try {
      bluetoothStatus = await Permission.bluetooth.isGranted;
    } catch (_) {
      // Bluetooth may be restricted on some devices — treated as non-blocking
      bluetoothStatus = true;
    }
    
    final notificationsStatus = await Permission.notification.isGranted;

    if (mounted) {
      setState(() {
        _locGranted = locStatusAlways || locStatusInUse;
        _cameraGranted = cameraStatus;
        _photosGranted = photosStatus;
        _bluetoothGranted = bluetoothStatus;
        _notificationsGranted = notificationsStatus;
      });
    }
  }

  /// Location: Always / When in Use
  Future<void> _grantLocation() async {
    // 1. Request foreground location first as required by modern OS constraints
    var status = await Permission.location.request();
    if (status.isGranted) {
      // 2. Request always-on (background) location
      await Permission.locationAlways.request();
    }
    await _checkPermissions();
  }

  /// Camera Access
  Future<void> _grantCamera() async {
    await Permission.camera.request();
    await _checkPermissions();
  }

  /// Photo Library / Storage
  Future<void> _grantPhotos() async {
    await Permission.photos.request();
    await Permission.storage.request();
    await _checkPermissions();
  }

  /// Bluetooth Connectivity
  Future<void> _grantBluetooth() async {
    try {
      final status = await Permission.bluetooth.request();
      // Bluetooth may be restricted on some devices — treated as non-blocking
      if (status.isRestricted || status.isPermanentlyDenied) {
        setState(() {
          _bluetoothGranted = true;
        });
      }
    } catch (_) {
      // Bluetooth may be restricted on some devices — treated as non-blocking
      setState(() {
        _bluetoothGranted = true;
      });
    }
    await _checkPermissions();
  }

  /// Push Notifications
  Future<void> _grantNotifications() async {
    await Permission.notification.request();
    await _checkPermissions();
  }

  /// Helper getter to determine if all 5 permissions are satisfied
  bool get _allGranted =>
      _locGranted &&
      _cameraGranted &&
      _photosGranted &&
      _notificationsGranted;
      // Bluetooth is checked but does not block app flow

  /// Handles auto-requesting all missing permissions sequentially
  Future<void> _grantAllMissingPermissions() async {
    if (!_locGranted) await _grantLocation();
    if (!_cameraGranted) await _grantCamera();
    if (!_photosGranted) await _grantPhotos();
    if (!_bluetoothGranted) await _grantBluetooth();
    if (!_notificationsGranted) await _grantNotifications();
  }

  /// Save flag in SharedPreferences and continue to next screen
  void _handleContinue() async {
    if (!_allGranted) {
      // Request any outstanding permissions before letting user continue
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

    // SUCCESS: Save flag in SharedPreferences to prevent onboarding from showing again
    // Renamed flag/setting: permissions_granted = true
    await StorageHelper.setPermissionsGranted(true);

    if (widget.onPermissionsGranted != null) {
      widget.onPermissionsGranted!();
    } else {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      await authProvider.checkAuthStatus();
      if (mounted) {
        if (authProvider.isAuthenticated) {
          Navigator.pushReplacementNamed(context, '/home');
        } else {
          Navigator.pushReplacementNamed(context, '/login');
        }
      }
    }
  }

  Widget _buildPermissionItem({
    required IconData icon,
    required String title,
    required String explanation,
    required bool isGranted,
    required VoidCallback onGrant,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.outlineVariant, width: 1),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: isGranted
                  ? AppColors.secondaryContainer.withOpacity(0.15)
                  : AppColors.primaryContainer.withOpacity(0.15),
              shape: BoxShape.circle,
            ),
            child: Icon(
              icon,
              color: isGranted ? AppColors.secondary : AppColors.primary,
              size: 24,
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
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 12),
          SizedBox(
            height: 36,
            child: isGranted
                ? const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle, color: AppColors.secondary, size: 20),
                      SizedBox(width: 4),
                      Text(
                        'Active',
                        style: TextStyle(
                          color: AppColors.secondary,
                          fontWeight: FontWeight.bold,
                          fontSize: 13,
                        ),
                      ),
                    ],
                  )
                : TextButton(
                    onPressed: onGrant,
                    style: TextButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      backgroundColor: AppColors.primaryContainer,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Grant',
                      style: TextStyle(
                        color: AppColors.primary,
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const SizedBox(height: 16),
              const Center(
                child: Icon(
                  Icons.shield_outlined,
                  size: 64,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(height: 16),
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
              const SizedBox(height: 10),
              const Text(
                'To begin tracking your shifts, resolving client visits, and managing your tasks, please configure the required permissions.',
                style: TextStyle(
                  fontSize: 13,
                  color: AppColors.onSurfaceVariant,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              Expanded(
                child: ListView(
                  physics: const BouncingScrollPhysics(),
                  children: [
                    _buildPermissionItem(
                      icon: Icons.my_location,
                      title: 'Location (Always / When in Use)',
                      explanation: 'Needed for GPS tracking and distance calculation',
                      isGranted: _locGranted,
                      onGrant: _grantLocation,
                    ),
                    _buildPermissionItem(
                      icon: Icons.camera_alt,
                      title: 'Camera',
                      explanation: 'Needed to upload odometer photos and task proof',
                      isGranted: _cameraGranted,
                      onGrant: _grantCamera,
                    ),
                    _buildPermissionItem(
                      icon: Icons.photo_library,
                      title: 'Photo Library / Storage',
                      explanation: 'Needed to select images from your gallery',
                      isGranted: _photosGranted,
                      onGrant: _grantPhotos,
                    ),
                    _buildPermissionItem(
                      icon: Icons.bluetooth,
                      title: 'Bluetooth',
                      explanation: 'Needed to detect device connectivity status',
                      isGranted: _bluetoothGranted,
                      onGrant: _grantBluetooth,
                    ),
                    _buildPermissionItem(
                      icon: Icons.notifications,
                      title: 'Notifications',
                      explanation: 'Needed to receive task alerts and updates',
                      isGranted: _notificationsGranted,
                      onGrant: _grantNotifications,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              CustomButton(
                text: _allGranted ? 'Continue' : 'Grant Required Permissions',
                onPressed: _handleContinue,
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }
}
