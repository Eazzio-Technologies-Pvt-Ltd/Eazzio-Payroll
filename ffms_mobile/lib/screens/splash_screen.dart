import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/utils/storage_helper.dart';
import '../core/theme/app_theme.dart';
import 'permissions_screen.dart';
import '../core/utils/developer_mode_check.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAuth();
  }

  Future<void> _checkAuth() async {
    final isBlocked = await DeveloperModeCheck.checkAndShowDialog(context);
    if (isBlocked) return;

    // 1-second delay for checking authentication
    await Future.delayed(const Duration(seconds: 1));
    
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
    return const Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: SizedBox(
          width: 32,
          height: 32,
          child: CircularProgressIndicator(
            strokeWidth: 3.0,
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      ),
    );
  }
}
