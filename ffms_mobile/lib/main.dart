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
import 'core/utils/notification_helper.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize communication port for flutter_foreground_task
  FlutterForegroundTask.initCommunicationPort();
  
  LocationService.initForegroundTask();
  
  // Initialize API service and Secure Storage
  await ApiService.initialize();
  await NotificationHelper.initialize();
  
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
      child: const FFMSApp(),
    ),
  );
}

class FFMSApp extends StatelessWidget {
  const FFMSApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FieldTrack',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/login': (context) => const LoginScreen(),
        '/home': (context) => const MainNavigation(),
        '/notifications': (context) => const NotificationsScreen(),
        '/leave-status': (context) => const LeaveStatusScreen(),
        '/leave-details': (context) => const LeaveDetailsScreen(),
      },
    );
  }
}
