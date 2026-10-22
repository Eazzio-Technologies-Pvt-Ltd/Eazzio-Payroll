import 'package:flutter/material.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/utils/storage_helper.dart';
import '../core/theme/app_theme.dart';
import '../services/location_service.dart';
import 'permissions_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeIn);
    _animController.forward();
    _checkAuth();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _checkAuth() async {
    try {
      // 1. Minimum splash display time for smooth branding entrance
      await Future.delayed(const Duration(milliseconds: 1500));

      if (!mounted) return;

      // 2. Safe check of storage and background task (with 3-second hard timeout to avoid infinite hang)
      try {
        final token = await StorageHelper.getAccessToken().timeout(const Duration(seconds: 2));
        if (token != null && StorageHelper.isTrackingActive()) {
          final isRunning = await FlutterForegroundTask.isRunningService.timeout(const Duration(seconds: 2));
          if (!isRunning) {
            debugPrint('[SplashScreen] Restoring background tracking service...');
            await LocationService().startTracking(shiftStatus: 'Restored Active').timeout(const Duration(seconds: 3));
          }
        }
      } catch (e) {
        debugPrint('[SplashScreen] Tracking restoration skipped/timed out: $e');
      }

      if (!mounted) return;

      final bool hasGrantedAllPermissions = StorageHelper.hasPermissionsBeenGranted();

      if (!hasGrantedAllPermissions) {
        if (!mounted) return;
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(
            builder: (context) => PermissionsScreen(
              onPermissionsGranted: () async {
                final innerNavigator = Navigator.of(context);
                final authProvider = Provider.of<AuthProvider>(context, listen: false);
                try {
                  await authProvider.checkAuthStatus().timeout(const Duration(seconds: 4));
                } catch (e) {
                  debugPrint('Auth check failed: $e');
                }
                if (authProvider.isAuthenticated) {
                  innerNavigator.pushReplacementNamed('/home');
                } else {
                  innerNavigator.pushReplacementNamed('/role_selection');
                }
              },
            ),
          ),
        );
        return;
      }

      final navigator = Navigator.of(context);
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      try {
        await authProvider.checkAuthStatus().timeout(const Duration(seconds: 4));
      } catch (e) {
        debugPrint('Auth check failed: $e');
      }

      if (!mounted) return;

      if (authProvider.isAuthenticated) {
        navigator.pushReplacementNamed('/home');
      } else {
        navigator.pushReplacementNamed('/role_selection');
      }
    } catch (criticalErr) {
      debugPrint('[SplashScreen] Critical unhandled error in splash: $criticalErr');
      if (mounted) {
        Navigator.of(context).pushReplacementNamed('/role_selection');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: const CircularProgressIndicator(
            strokeWidth: 2.5,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      ),
    );
  }
}
