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
    // Minimum splash display time for branding
    await Future.delayed(const Duration(milliseconds: 1800));

    if (!mounted) return;

    // Restore background tracking service if user was punched in before app kill
    // This is done HERE (after widget tree is ready) — NOT in main() —
    // to prevent permission dialogs from showing before Flutter initializes.
    try {
      final token = await StorageHelper.getAccessToken();
      if (token != null && StorageHelper.isTrackingActive()) {
        final isRunning = await FlutterForegroundTask.isRunningService;
        if (!isRunning) {
          debugPrint('[SplashScreen] Restoring background tracking service...');
          await LocationService().startTracking(shiftStatus: 'Restored Active');
        }
      }
    } catch (e) {
      debugPrint('[SplashScreen] Tracking restoration failed (non-fatal): $e');
    }

    if (!mounted) return;

    final bool hasGrantedAllPermissions = StorageHelper.hasPermissionsBeenGranted();

    if (!hasGrantedAllPermissions) {
      if (!mounted) return;
      final navigator = Navigator.of(context);
      navigator.pushReplacement(
        MaterialPageRoute(
          builder: (context) => PermissionsScreen(
            onPermissionsGranted: () async {
              final innerNavigator = Navigator.of(context);
              final authProvider = Provider.of<AuthProvider>(context, listen: false);
              try {
                await authProvider.checkAuthStatus().timeout(const Duration(seconds: 5));
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
      await authProvider.checkAuthStatus().timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('Auth check failed: $e');
    }

    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      navigator.pushReplacementNamed('/home');
    } else {
      navigator.pushReplacementNamed('/role_selection');
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
