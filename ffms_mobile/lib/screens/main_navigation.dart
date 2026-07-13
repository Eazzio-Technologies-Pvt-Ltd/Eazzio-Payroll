import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:provider/provider.dart';
import 'home_screen.dart';
import 'tasks_screen.dart';
import 'map_screen.dart';
import 'attendance_screen.dart';
import 'profile_screen.dart';
import '../core/theme/app_theme.dart';
import '../providers/attendance_provider.dart';
import '../providers/auth_provider.dart';
import '../services/auto_punch_out_service.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;
  bool _initializedArgs = false;

  final List<Widget> _screens = [
    const HomeScreen(),
    const TasksScreen(),
    const MapScreen(),
    const AttendanceScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    // Start the auto punch-out service once the user is authenticated
    // and the home navigation is mounted.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final attendanceProvider = Provider.of<AttendanceProvider>(
        context,
        listen: false,
      );
      AutoPunchOutService.instance.start(attendanceProvider);
      debugPrint('[MainNavigation] AutoPunchOutService started.');
    });
  }

  @override
  void dispose() {
    // Stop the auto punch-out service when navigating away (e.g., logout)
    AutoPunchOutService.instance.stop();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_initializedArgs) {
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is int) {
        _currentIndex = args;
      }
      _initializedArgs = true;
    }
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    if (authProvider.state == AuthState.unauthenticated) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        Navigator.pushNamedAndRemoveUntil(
          context,
          '/role_selection',
          (route) => false,
        );
      });
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(
            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
          ),
        ),
      );
    }

    return Scaffold(
      body: IndexedStack(index: _currentIndex, children: _screens),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          border: Border(
            top: BorderSide(color: AppColors.outlineVariant, width: 0.5),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: (index) {
            setState(() => _currentIndex = index);
          },
          type: BottomNavigationBarType.fixed,
          backgroundColor: AppColors.surface,
          selectedItemColor: AppColors.primary,
          unselectedItemColor: AppColors.outline,
          selectedLabelStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: const TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
          items: const [
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.house),
              activeIcon: Icon(LucideIcons.house),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.listTodo),
              activeIcon: Icon(LucideIcons.listTodo),
              label: 'Tasks',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.mapPinned),
              activeIcon: Icon(LucideIcons.mapPinned),
              label: 'Map',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.calendarDays),
              activeIcon: Icon(LucideIcons.calendarDays),
              label: 'Attendance',
            ),
            BottomNavigationBarItem(
              icon: Icon(LucideIcons.circleUser),
              activeIcon: Icon(LucideIcons.circleUser),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }
}
