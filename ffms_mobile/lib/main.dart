import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'services/api_service.dart';
import 'services/location_service.dart';
import 'package:flutter_foreground_task/flutter_foreground_task.dart';
import 'providers/auth_provider.dart';
import 'providers/task_provider.dart';
import 'providers/attendance_provider.dart';
import 'providers/leave_provider.dart';
import 'providers/expense_provider.dart';
import 'providers/notification_provider.dart';
import 'providers/feedback_provider.dart';
import 'providers/travel_provider.dart';
import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/main_navigation.dart';
import 'screens/notifications_screen.dart';
import 'screens/leave_status_screen.dart';
import 'screens/leave_details_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/role_selection_screen.dart';
import 'screens/alarm_settings_screen.dart';
import 'core/utils/notification_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // Initialize communication port for flutter_foreground_task
    FlutterForegroundTask.initCommunicationPort();
  } catch (e) {
    debugPrint('Failed to initialize foreground task communication port: $e');
  }
  
  try {
    LocationService.initForegroundTask();
  } catch (e) {
    debugPrint('Failed to initialize location foreground task: $e');
  }
  
  try {
    // Initialize API service and Secure Storage
    await ApiService.initialize();

    // NOTE: Background tracking restoration is intentionally deferred to SplashScreen.
    // Calling LocationService().startTracking() here (in main) would trigger
    // system permission dialogs (Geolocator.requestPermission) BEFORE the Flutter
    // widget tree exists, causing black screen / ANR crashes on Android.
    // SplashScreen handles restoration after the app UI is fully initialized.
  } catch (e) {
    debugPrint('Failed to initialize API Service / StorageHelper: $e');
  }

  try {
    await NotificationHelper.initialize();
  } catch (e) {
    debugPrint('Failed to initialize Notification Helper: $e');
  }
  
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => TaskProvider()),
        ChangeNotifierProvider(create: (_) => AttendanceProvider()),
        ChangeNotifierProvider(create: (_) => LeaveProvider()),
        ChangeNotifierProvider(create: (_) => ExpenseProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
        ChangeNotifierProvider(create: (_) => FeedbackProvider()),
        ChangeNotifierProvider(create: (_) => TravelProvider()),
      ],
      child: const EazzioPayrollApp(),
    ),
  );
}

class EazzioPayrollApp extends StatelessWidget {
  const EazzioPayrollApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Eazzio Payroll',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme.copyWith(
        pageTransitionsTheme: PageTransitionsTheme(
          builders: {
            TargetPlatform.android: const _SlidePageTransition(),
            TargetPlatform.iOS: const _SlidePageTransition(),
          },
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/role_selection': (context) => const RoleSelectionScreen(),
        '/home': (context) => const MainNavigation(),
        '/notifications': (context) => const NotificationsScreen(),
        '/leave-status': (context) => const LeaveStatusScreen(),
        '/leave-details': (context) => const LeaveDetailsScreen(),
        '/profile': (context) => const ProfileScreen(),
        '/alarm-settings': (context) => const AlarmSettingsScreen(),
      },
    );
  }
}

class _SlidePageTransition extends PageTransitionsBuilder {
  const _SlidePageTransition();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    // Global page transition - slide + fade from right
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1.0, 0),
        end: Offset.zero,
      ).animate(CurvedAnimation(
        parent: animation,
        curve: Curves.easeOutCubic,
      )),
      child: FadeTransition(
        opacity: animation,
        child: child,
      ),
    );
  }
}
