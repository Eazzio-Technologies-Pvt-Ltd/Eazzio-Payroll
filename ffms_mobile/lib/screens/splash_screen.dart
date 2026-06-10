import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/storage_helper.dart';
import 'permissions_screen.dart';

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
    // Small delay to show brand logo
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;

    // Check SharedPreferences flag. On the first launch, this flag defaults to false,
    // requiring the user to complete the permission onboarding screen.
    // On subsequent launches, we read this flag and skip the permissions screen directly.
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
              await authProvider.checkAuthStatus();
              if (authProvider.isAuthenticated) {
                innerNavigator.pushReplacementNamed('/home');
              } else {
                innerNavigator.pushReplacementNamed('/login');
              }
            },
          ),
        ),
      );
      return;
    }
    
    final navigator = Navigator.of(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.checkAuthStatus();
    
    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      navigator.pushReplacementNamed('/home');
    } else {
      navigator.pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset(
              'assets/images/logo.png',
              height: 100,
              fit: BoxFit.contain,
            ),
            const SizedBox(height: 16),
            const Text(
              'Smart Workforce Tracking',
              style: TextStyle(
                fontFamily: 'Plus Jakarta Sans',
                fontSize: 14,
                color: AppColors.onSurfaceVariant,
              ),
            ),
            SizedBox(height: 48),
            CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
            ),
          ],
        ),
      ),
    );
  }
}
