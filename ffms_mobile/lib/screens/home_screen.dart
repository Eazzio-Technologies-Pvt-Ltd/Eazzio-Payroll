import 'dart:convert';
import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:geolocator/geolocator.dart';
import 'package:battery_plus/battery_plus.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../utils/image_upload_util.dart';
import '../providers/task_provider.dart';
import '../providers/attendance_provider.dart';
import '../providers/notification_provider.dart';
import '../providers/travel_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/user_avatar.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/constants.dart';
import 'permissions_screen.dart';
import 'request_advance_screen.dart';
import '../core/utils/responsive.dart'; // Responsive helper — no hardcoded sizes
import '../widgets/animated_counter.dart';
import '../widgets/animated_card.dart';

// Home screen v2 — premium card layouts + modern gradients
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isInit = true;
  Timer? _countUpTimer;
  String _travelFilter = '7'; // Default to 7 Days
  DateTimeRange? _customDateRange;

  // ─────────────────────────── Time-based Greeting ─────────────────────────────
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  @override
  void initState() {
    super.initState();
    // A lightweight 1-minute ticker keeps the "Hours Worked" calculation fresh without
    // flooding setState every second.
    _countUpTimer = Timer.periodic(const Duration(minutes: 1), (timer) {
      if (mounted) {
        setState(() {});
      }
    });
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_isInit) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadData());
      _isInit = false;
    }
  }

  @override
  void dispose() {
    _countUpTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    final taskProvider = Provider.of<TaskProvider>(context, listen: false);
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    final notificationProvider = Provider.of<NotificationProvider>(context, listen: false);
    final travelProvider = Provider.of<TravelProvider>(context, listen: false);

    // 1. Eagerly recover lost camera data before other API calls to restore punch-in UI state instantly
    try {
      await _checkAndRecoverLostSelfie();
    } catch (e) {
      debugPrint('Error running lost selfie recovery: $e');
    }

    // 2. Load dashboard feeds in parallel, protected against individual network/timeout failures
    try {
      await Future.wait([
        taskProvider.fetchMyTasks().catchError((e) {
          debugPrint('Error fetching tasks: $e');
          return null;
        }),
        attendanceProvider.fetchTodayState().catchError((e) {
          debugPrint('Error fetching today attendance state: $e');
          return null;
        }),
        notificationProvider.fetchNotifications().catchError((e) {
          debugPrint('Error fetching notifications: $e');
          return null;
        }),
        travelProvider.fetchTodayTravel().catchError((e) {
          debugPrint('Error fetching today travel: $e');
          return null;
        }),
        travelProvider.fetchMonthlySummary().catchError((e) {
          debugPrint('Error fetching monthly summary: $e');
          return null;
        }),
        travelProvider.fetchTravelHistory(limit: 30).catchError((e) {
          debugPrint('Error fetching travel history: $e');
          return null;
        }),
      ]);
    } catch (e) {
      debugPrint('Unexpected error in initial dashboard parallel load: $e');
    }

    // 3. Sync any pending offline punch-in/out records from previous sessions
    try {
      await attendanceProvider.syncPendingPunches();
    } catch (e) {
      debugPrint('Error syncing pending punches: $e');
    }
  }

  Future<void> _checkAndRecoverLostSelfie() async {
    final pending = StorageHelper.getPendingAction();
    if (pending != 'PUNCH_IN') return;

    // Clear the pending action immediately so we don't end up in an infinite recovery loop if there is a crash/error
    await StorageHelper.savePendingAction(null);

    try {
      final picker = ImagePicker();
      final LostDataResponse response = await picker.retrieveLostData();
      if (response.isEmpty || response.file == null) {
        return;
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Resuming Check-In. Processing captured selfie...'),
            backgroundColor: AppColors.primary,
            duration: Duration(seconds: 3),
          ),
        );
      }

      // Process the recovered file
      final processed = await ImageUploadUtil.processPickedImage(context, response.file!);
      if (processed == null) return;

      final base64Selfie = processed.base64String;

      // Get location
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Getting your location...'), duration: Duration(seconds: 2)),
        );
      }

      Position? position;
      try {
        position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 15),
        );
      } catch (e) {
        position = await Geolocator.getLastKnownPosition();
        if (position == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('GPS signal too weak to complete resumed Check-In. Please try checking in again.'),
                backgroundColor: AppColors.error,
              ),
            );
          }
          return;
        }
      }

      // Execute punch in
      final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
      final success = await attendanceProvider.punchIn(position, selfieBase64: base64Selfie);

      if (mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Resumed Check-In Successful! Syncing to server...'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error recovering lost selfie data: $e');
    }
  }

  Future<void> _handleAttendanceAction() async {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);

    final permission = await GeolocatorPlatform.instance.checkPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => PermissionsScreen(
              onPermissionsGranted: () {
                Navigator.pop(context);
                _handleAttendanceAction();
              },
            ),
          ),
        );
      }
      return;
    }

    final bool wasPunchedIn = attendanceProvider.isPunchedIn;
    String? base64Selfie;

    // ── Selfie capture (punch-in only) ───────────────────────────────────────
    try {
      if (!wasPunchedIn) {
        final battery = Battery();
        final batteryLevel = await battery.batteryLevel;
        if (batteryLevel < 40) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Battery must be 40%+ to Punch In. Current: $batteryLevel%'),
                backgroundColor: AppColors.error,
              ),
            );
          }
          return;
        }

        // Reusable image upload utility: checks camera permission, formats/sizes selfie under 1MB
        await StorageHelper.savePendingAction('PUNCH_IN');
        final result = await ImageUploadUtil.pickAndCompressImage(
          context,
          cameraOnly: true,
          preferredCameraDevice: CameraDevice.front,
        );
        await StorageHelper.savePendingAction(null);
        if (result == null) {
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Selfie photo is required to Punch In.')),
            );
          }
          return;
        }

        base64Selfie = result.base64String;
      }
    } catch (e) {
      await StorageHelper.savePendingAction(null);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Selfie capture failed: $e'), backgroundColor: AppColors.error),
        );
      }
      return;
    }

    // ── GPS resolution (15s timeout with fallback) ───────────────────────────
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Getting your location...'), duration: Duration(seconds: 2)),
      );
    }

    Position? position;
    try {
      position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 15),
      );
    } catch (e) {
      position = await Geolocator.getLastKnownPosition();
      if (position == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('GPS signal is too weak. Please ensure location services are enabled and try again.'),
              backgroundColor: AppColors.error,
            ),
          );
        }
        return;
      }
    }

    // ── Execute punch action ─────────────────────────────────────────────────
    if (wasPunchedIn) {
      // Punch-out is synchronous (no selfie, fast operation)
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );

      final success = await attendanceProvider.punchOut(position);

      if (mounted) {
        Navigator.pop(context); // Close loading dialog
        if (success) {
          await StorageHelper.savePunchOutTime(DateTime.now().toIso8601String());
          await StorageHelper.clearPunchInTime();
        }
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(success
                ? 'Punched Out Successfully!'
                : (attendanceProvider.errorMessage ?? 'Punch Out failed')),
            backgroundColor: success ? AppColors.success : AppColors.error,
          ),
        );
      }
    } else {
      // Punch-in is OPTIMISTIC — UI updates immediately, backend syncs in background
      final success = await attendanceProvider.punchIn(position, selfieBase64: base64Selfie);

      if (mounted && success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Punched In Successfully! Syncing to server...'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Uses Responsive helper — no hardcoded sizes
    final r = Responsive(context);
    final authUser = Provider.of<AuthProvider>(context).currentUser;
    final attendanceProvider = Provider.of<AttendanceProvider>(context);
    final notifProvider = Provider.of<NotificationProvider>(context);
    final travelProvider = Provider.of<TravelProvider>(context);

    final todayDate = DateFormat('EEEE, MMMM d').format(DateTime.now());
    final greeting = _getGreeting();

    // Today's punch info from sessions
    final sessions = attendanceProvider.todaySessions;
    DateTime? firstPunchIn = sessions.isNotEmpty ? sessions.first.punchInTime : null;
    if (firstPunchIn == null && attendanceProvider.isPunchedIn) {
      final storedIn = StorageHelper.getPunchInTime();
      if (storedIn != null) {
        firstPunchIn = DateTime.tryParse(storedIn);
      }
    }

    DateTime? lastPunchOut = sessions.isNotEmpty && sessions.last.punchOutTime != null 
        ? sessions.last.punchOutTime 
        : null;
    if (lastPunchOut == null) {
      final storedOut = StorageHelper.getPunchOutTime();
      if (storedOut != null) {
        lastPunchOut = DateTime.tryParse(storedOut);
      }
    }

    double totalHours = 0.0;
    if (sessions.isNotEmpty) {
      totalHours = sessions.fold<double>(0.0, (sum, s) {
        if (s.punchOutTime != null) {
          return sum + (s.totalWorkingHours ?? 0.0);
        } else {
          final pTime = s.punchInTime ?? firstPunchIn;
          if (pTime != null) {
            final diff = DateTime.now().difference(pTime.toLocal());
            final hours = diff.inMinutes / 60.0;
            return sum + (hours > 0 ? hours : 0.0);
          }
          return sum;
        }
      });
    }

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      appBar: AppBar(
        title: Text(
          'Eazzio Payroll',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primary),
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: AppColors.textSecondary),
                onPressed: () => Navigator.pushNamed(context, '/notifications'),
              ),
              if (notifProvider.unreadCount > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(color: AppColors.error, shape: BoxShape.circle),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${notifProvider.unreadCount}',
                      style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          const SizedBox(width: 8),
        ],
        backgroundColor: AppColors.surface,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: AppColors.border, height: 1),
        ),
      ),
      body: RefreshIndicator(
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        strokeWidth: 2.5,
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: EdgeInsets.all(r.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ─── Header Greeting ────────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '$greeting, ${authUser?.name.split(' ').first ?? 'Employee'} 👋',
                          style: GoogleFonts.inter(
                            fontSize: r.fontXXL,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        SizedBox(height: r.spaceXS),
                        Text(
                          todayDate,
                          style: GoogleFonts.inter(
                            fontSize: r.fontSM,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  UserAvatar(
                    photoUrl: authUser?.profileImage,
                    name: authUser?.name ?? 'Employee',
                    radius: r.iconSizeMD,
                    onTap: () => Navigator.pushNamed(context, '/profile'),
                  ),
                ],
              ),
              SizedBox(height: r.spaceMD),

              // ─── Punch Action Button ─────────────────────────────────
              (() {
                final isDayComplete = attendanceProvider.isDayComplete;
                if (isDayComplete) {
                  return Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppColors.successSoft,
                        border: Border.all(color: AppColors.success, width: 1.5),
                        borderRadius: BorderRadius.circular(30),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.check_circle, color: AppColors.success, size: 24),
                          const SizedBox(width: 8),
                          Text(
                            'Day Complete',
                            style: GoogleFonts.inter(
                              color: AppColors.success,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }

                final isPunchedIn = attendanceProvider.isPunchedIn;
                final sessionCount = sessions.length;
                String buttonText;
                IconData buttonIcon;

                if (!isPunchedIn && sessionCount == 0) {
                  buttonText = 'Punch In (Session 1)';
                  buttonIcon = Icons.how_to_reg;
                } else if (isPunchedIn && sessionCount == 1) {
                  buttonText = 'Punch Out (Session 1)';
                  buttonIcon = Icons.logout;
                } else if (!isPunchedIn && sessionCount == 1) {
                  buttonText = 'Punch In (Session 2)';
                  buttonIcon = Icons.how_to_reg;
                } else {
                  buttonText = 'Punch Out (Session 2)';
                  buttonIcon = Icons.logout;
                }

                // Gradient punch buttons with custom shadows
                return Container(
                  width: double.infinity,
                  height: 56,
                  decoration: BoxDecoration(
                    gradient: isPunchedIn ? AppTheme.punchOutGradient : AppTheme.punchInGradient,
                    borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    boxShadow: [
                      BoxShadow(
                        color: (isPunchedIn ? AppColors.error : AppColors.success).withOpacity(0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.transparent,
                      shadowColor: Colors.transparent,
                      disabledBackgroundColor: Colors.transparent,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                      ),
                    ),
                    onPressed: attendanceProvider.isLoading ? null : _handleAttendanceAction,
                    child: attendanceProvider.isLoading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(buttonIcon, size: 20, color: Colors.white),
                              const SizedBox(width: 8),
                              Text(
                                buttonText,
                                style: GoogleFonts.inter(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                );
              })(),
              const SizedBox(height: 20),

              // ─── 2b: Three-Card Punch Layout ──────────────────────────────
              Row(
                children: [
                  // Card 1: Punch In Time
                  Expanded(
                    child: AnimatedCard(
                      padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
                      child: Column(
                        children: [
                          Text(
                            'Punch In Time',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            firstPunchIn != null
                                ? DateFormat('HH:mm:ss').format(firstPunchIn.toLocal())
                                : '--:--:--',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.success,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            firstPunchIn != null ? 'Started' : 'Not Active',
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Card 2: Punch Out Time
                  Expanded(
                    child: AnimatedCard(
                      padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
                      child: Column(
                        children: [
                          Text(
                            'Punch Out Time',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            lastPunchOut != null
                                ? DateFormat('HH:mm:ss').format(lastPunchOut.toLocal())
                                : '--:--:--',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.error,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            lastPunchOut != null ? 'Completed' : 'Pending',
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Card 3: Hours Worked Today
                  Expanded(
                    child: AnimatedCard(
                      padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
                      child: Column(
                        children: [
                          Text(
                            'Hours Worked',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '${totalHours.toStringAsFixed(1)} hrs',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Target: 9h',
                            style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Target 9h progress bar
              AnimatedCard(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Shift Progress',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                        ),
                        Text(
                          '${(totalHours * 60).round() ~/ 60}h ${(totalHours * 60).round() % 60}m / 9h 00m',
                          style: GoogleFonts.inter(fontSize: 12, color: AppColors.primary, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: (totalHours / 9.0).clamp(0.0, 1.0),
                        backgroundColor: AppColors.border,
                        color: AppColors.primary,
                        minHeight: 8,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ─── 2c: Two-Column Distance Travel Block ───────────────────
              AnimatedCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Travel & Odometer Summary',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    (() {
                      final leftCol = Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.bgInput,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Text(
                              "Today's Entry",
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary),
                            ),
                            const SizedBox(height: 12),
                            if (travelProvider.todayLog == null) ...[
                              Text(
                                'No odometer readings recorded for today.',
                                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                              ),
                              const SizedBox(height: 12),
                              ElevatedButton(
                                onPressed: () => _showTravelEntrySheet(context, travelProvider),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: Text('Are You Travelling Today?', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold)),
                              ),
                            ] else ...[
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Start Meter:', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                                  Text('${travelProvider.todayLog!.meterStart?.toStringAsFixed(0) ?? "--"} KM', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('End Meter:', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                                  Text('${travelProvider.todayLog!.meterEnd?.toStringAsFixed(0) ?? "--"} KM', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                ],
                              ),
                              const SizedBox(height: 8),
                              const Divider(height: 12),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Distance:', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                  AnimatedCounter(
                                    value: travelProvider.todayDistanceKm,
                                    suffix: ' KM',
                                    precision: 1,
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primary),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('Allowance:', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                  AnimatedCounter(
                                    value: travelProvider.todayAllowance,
                                    prefix: '₹',
                                    precision: 0,
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                                  ),
                                ],
                              ),
                              if (travelProvider.todayLog!.meterEnd == null) ...[
                                const SizedBox(height: 12),
                                ElevatedButton(
                                  onPressed: () {
                                    showModalBottomSheet(
                                      context: context,
                                      isScrollControlled: true,
                                      backgroundColor: Colors.transparent,
                                      builder: (sheetContext) => TravelEntrySheet(travelProvider: travelProvider),
                                    );
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: Colors.white,
                                    padding: const EdgeInsets.symmetric(vertical: 8),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                  ),
                                  child: Text('Complete Travel Log', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ],
                          ],
                        ),
                      );

                      final rightCol = Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.bgInput,
                          borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  'History',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                ),
                                DropdownButton<String>(
                                  value: _travelFilter,
                                  isDense: true,
                                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.primary, fontWeight: FontWeight.bold),
                                  underline: const SizedBox(),
                                  items: const [
                                    DropdownMenuItem(value: 'today', child: Text('Today')),
                                    DropdownMenuItem(value: '7', child: Text('7 Days')),
                                    DropdownMenuItem(value: '15', child: Text('15 Days')),
                                    DropdownMenuItem(value: '30', child: Text('30 Days')),
                                    DropdownMenuItem(value: 'custom', child: Text('Custom')),
                                  ],
                                  onChanged: (val) async {
                                    if (val == 'custom') {
                                      final range = await showDateRangePicker(
                                        context: context,
                                        firstDate: DateTime.now().subtract(const Duration(days: 90)),
                                        lastDate: DateTime.now(),
                                      );
                                      if (range != null) {
                                        setState(() {
                                          _customDateRange = range;
                                          _travelFilter = 'custom';
                                        });
                                      }
                                    } else if (val != null) {
                                      setState(() {
                                        _travelFilter = val;
                                      });
                                    }
                                  },
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            (() {
                              final now = DateTime.now();
                              final filteredLogs = travelProvider.history.where((log) {
                                final logDate = log.date.toLocal();
                                if (_travelFilter == 'today') {
                                  return logDate.year == now.year && logDate.month == now.month && logDate.day == now.day;
                                } else if (_travelFilter == '7') {
                                  return now.difference(logDate).inDays <= 7;
                                } else if (_travelFilter == '15') {
                                  return now.difference(logDate).inDays <= 15;
                                } else if (_travelFilter == '30') {
                                  return now.difference(logDate).inDays <= 30;
                                } else if (_travelFilter == 'custom' && _customDateRange != null) {
                                  return logDate.isAfter(_customDateRange!.start.subtract(const Duration(days: 1))) &&
                                      logDate.isBefore(_customDateRange!.end.add(const Duration(days: 1)));
                                }
                                  return true;
                              }).toList();

                              if (filteredLogs.isEmpty) {
                                return Padding(
                                  padding: const EdgeInsets.symmetric(vertical: 20.0),
                                  child: Text(
                                    'No travel logs found.',
                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                                    textAlign: TextAlign.center,
                                  ),
                                );
                              }

                              double totalAllowance = filteredLogs.fold(0.0, (sum, log) => sum + log.allowanceAmount);

                              return Column(
                                children: [
                                  SizedBox(
                                    height: 100,
                                    child: ListView.separated(
                                      shrinkWrap: true,
                                      itemCount: filteredLogs.length,
                                      separatorBuilder: (_, __) => const Divider(height: 8),
                                      itemBuilder: (context, index) {
                                        final log = filteredLogs[index];
                                        return Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Text(
                                              DateFormat('dd MMM').format(log.date.toLocal()),
                                              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                                            ),
                                            Text(
                                              '${log.totalDistanceKm.toStringAsFixed(0)} KM',
                                              style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                                            ),
                                            Text(
                                              '₹${log.allowanceAmount.toStringAsFixed(0)}',
                                              style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                                            ),
                                          ],
                                        );
                                      },
                                    ),
                                  ),
                                  const Divider(height: 12),
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text('Total:', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                                      AnimatedCounter(
                                        value: totalAllowance,
                                        prefix: '₹',
                                        precision: 0,
                                        style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                                      ),
                                    ],
                                  ),
                                ],
                              );
                            })(),
                          ],
                        ),
                      );

                      if (MediaQuery.of(context).size.width < 500) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            leftCol,
                            const SizedBox(height: 12),
                            rightCol,
                          ],
                        );
                      } else {
                        return Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Expanded(flex: 6, child: leftCol),
                            const SizedBox(width: 8),
                            Expanded(flex: 7, child: rightCol),
                          ],
                        );
                      }
                    })(),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // ─── 2d: Dynamic Salary Block ──────────────────────────────────
              AnimatedCard(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      'Salary Earned',
                      style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
                    ),
                    const SizedBox(height: 12),
                    (() {
                      final baseSalary = authUser?.baseSalary ?? 0.0;
                      if (baseSalary == 0.0) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16.0),
                          child: Text(
                            'Base salary not configured in your profile. Please contact HR.',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                            textAlign: TextAlign.center,
                          ),
                        );
                      }

                      final logs = attendanceProvider.attendanceHistory;
                      if (logs.isEmpty) {
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16.0),
                          child: Text(
                            'No attendance history to calculate salary.',
                            style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                            textAlign: TextAlign.center,
                          ),
                        );
                      }

                      // Calculate daily salary components (standard 26 working days)
                      final dailySalaryRate = baseSalary / 26.0;

                      // Group sessions by date to prevent duplicate rows
                      // LATE status treated as full day pay per business rules
                      final Map<String, List<dynamic>> groupedByDate = {};
                      for (final log in logs) {
                        final dateStr = DateFormat('yyyy-MM-dd').format(log.date);
                        groupedByDate.putIfAbsent(dateStr, () => []).add(log);
                      }

                      // Define status ranking to determine the highest status for multiple sessions
                      int getStatusRank(String status) {
                        final upper = status.toUpperCase();
                        if (upper == 'PRESENT' || upper == 'ON_DUTY') return 4;
                        if (upper == 'LATE') return 3;
                        if (upper == 'HALF_DAY') return 2;
                        if (upper == 'ABSENT') return 1;
                        return 0;
                      }

                      final List<Map<String, dynamic>> groupedLogs = groupedByDate.entries.map((entry) {
                        final dateLogs = entry.value;

                        // Sum total working hours for the date
                        double totalHours = 0.0;
                        for (final l in dateLogs) {
                          totalHours += l.totalWorkingHours ?? 0.0;
                        }

                        // Get highest status session of the date
                        dynamic highestLog = dateLogs.first;
                        int highestRank = getStatusRank(highestLog.status);
                        for (final l in dateLogs) {
                          final rank = getStatusRank(l.status);
                          if (rank > highestRank) {
                            highestRank = rank;
                            highestLog = l;
                          }
                        }

                        final finalStatus = highestLog.status.toUpperCase();
                        double salaryFactor = 0.0;
                        bool isPayable = false;

                        // PRESENT -> 100%, LATE -> 100%, HALF_DAY -> 50%, ABSENT or other -> 0%
                        if (finalStatus == 'PRESENT' || finalStatus == 'ON_DUTY' || finalStatus == 'LATE') {
                          salaryFactor = 1.0;
                          isPayable = true;
                        } else if (finalStatus == 'HALF_DAY') {
                          salaryFactor = 0.5;
                          isPayable = true;
                        }

                        final dailySalary = dailySalaryRate * salaryFactor;

                        return {
                          'date': highestLog.date as DateTime,
                          'totalHours': totalHours,
                          'dailySalary': dailySalary,
                          'isPayable': isPayable,
                        };
                      }).toList();

                      // Sort grouped logs by date descending
                      groupedLogs.sort((a, b) => (b['date'] as DateTime).compareTo(a['date'] as DateTime));

                      return Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          ListView.separated(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: groupedLogs.take(5).length,
                            separatorBuilder: (_, __) => const Divider(height: 8),
                            itemBuilder: (context, index) {
                              final gLog = groupedLogs[index];
                              final isPayable = gLog['isPayable'] as bool;
                              final dailySalary = gLog['dailySalary'] as double;
                              final date = gLog['date'] as DateTime;
                              final totalHours = gLog['totalHours'] as double;

                              return Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    DateFormat('dd MMM yyyy').format(date),
                                    style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                                  ),
                                  Text(
                                    '${totalHours.toStringAsFixed(1)} hrs',
                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                                  ),
                                  Text(
                                    '₹${dailySalary.toStringAsFixed(2)}',
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isPayable ? AppColors.success : AppColors.error,
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                          const Divider(height: 16),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                'Accrued Salary (This Month):',
                                style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                              ),
                              AnimatedCounter(
                                value: groupedLogs.fold<double>(0.0, (sum, gLog) {
                                  return sum + (gLog['dailySalary'] as double);
                                }),
                                prefix: '₹',
                                precision: 2,
                                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.success),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          
                          // Salary Advance Gradient Action Button
                          Container(
                            width: double.infinity,
                            height: 48,
                            decoration: BoxDecoration(
                              gradient: AppTheme.salaryGradient,
                              borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                              boxShadow: [
                                BoxShadow(
                                  color: AppColors.accent.withOpacity(0.20),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: ElevatedButton.icon(
                              onPressed: () {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (context) => const RequestAdvanceScreen(),
                                  ),
                                );
                              },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                disabledBackgroundColor: Colors.transparent,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                                ),
                              ),
                              icon: const Icon(Icons.payment, size: 18, color: Colors.white),
                              label: Text(
                                'Request Salary Advance',
                                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                              ),
                            ),
                          ),
                        ],
                      );
                    })(),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ],
          ),
        ),
      ),
    );
  }

  void _showTravelEntrySheet(BuildContext context, TravelProvider travelProvider) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        backgroundColor: AppColors.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Text('Are You Travelling Today?', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        content: Text(
          'If you are travelling for field force visits, please log your start and end odometer readings to claim travel allowance.',
          style: GoogleFonts.inter(fontSize: 13, height: 1.4, color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(dialogContext);
            },
            child: Text('No, I\'m Not', style: GoogleFonts.inter(color: AppColors.textSecondary, fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () {
              Navigator.pop(dialogContext);
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (sheetContext) => TravelEntrySheet(travelProvider: travelProvider),
              );
            },
            child: Text('Yes, I Am', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }
}

// ─── Stateful Bottom Sheet for Travel Meter Entry ────────────────────────

class TravelEntrySheet extends StatefulWidget {
  final TravelProvider travelProvider;

  const TravelEntrySheet({super.key, required this.travelProvider});

  @override
  State<TravelEntrySheet> createState() => _TravelEntrySheetState();
}

class _TravelEntrySheetState extends State<TravelEntrySheet> {
  final _formKey = GlobalKey<FormState>();
  final _startOdometerController = TextEditingController();
  final _endOdometerController = TextEditingController();
  
  XFile? _startPhoto;
  XFile? _endPhoto;
  double _distance = 0.0;
  String? _validationError;
  bool _isLoadingTodayLog = true;

  @override
  void initState() {
    super.initState();
    _startOdometerController.addListener(_calculateDistance);
    _endOdometerController.addListener(_calculateDistance);
    _loadTodayLog();
  }

  Future<void> _loadTodayLog() async {
    setState(() {
      _isLoadingTodayLog = true;
    });
    await widget.travelProvider.fetchTodayTravel();
    if (mounted) {
      final log = widget.travelProvider.todayLog;
      if (log != null && log.meterStart != null) {
        _startOdometerController.text = log.meterStart!.toStringAsFixed(0);
      }
      setState(() {
        _isLoadingTodayLog = false;
      });
    }
  }

  @override
  void dispose() {
    _startOdometerController.dispose();
    _endOdometerController.dispose();
    super.dispose();
  }

  double _getTravelRate() {
    if (widget.travelProvider.todayLog != null) {
      return widget.travelProvider.todayLog!.allowanceRate;
    }
    final auth = Provider.of<AuthProvider>(context, listen: false);
    if (auth.currentUser?.travelAllowanceRate != null) {
      return auth.currentUser!.travelAllowanceRate!;
    }
    return AppConstants.defaultTravelAllowanceRate;
  }

  void _calculateDistance() {
    final startVal = double.tryParse(_startOdometerController.text);
    final endVal = double.tryParse(_endOdometerController.text);
    if (startVal != null && endVal != null) {
      setState(() {
        _distance = endVal - startVal;
        if (endVal < startVal) {
          _validationError = 'End odometer reading must be greater than Start reading';
        } else {
          _validationError = null;
        }
      });
    } else {
      setState(() {
        _distance = 0.0;
        _validationError = null;
      });
    }
  }

  Future<void> _pickPhoto(bool isStart) async {
    final result = await ImageUploadUtil.pickAndCompressImage(
      context,
      cameraOnly: false,
      preferredCameraDevice: CameraDevice.rear,
    );
    if (result != null) {
      setState(() {
        if (isStart) {
          _startPhoto = XFile(result.path);
        } else {
          _endPhoto = XFile(result.path);
        }
      });
    }
  }

  Future<void> _submit() async {
    try {
      final isValidated = _formKey.currentState?.validate() ?? false;
      if (!isValidated) return;
      if (_validationError != null) return;

      final log = widget.travelProvider.todayLog;
      final isStartLogged = log != null && log.meterStart != null;

      final startVal = double.tryParse(_startOdometerController.text);
      final endVal = double.tryParse(_endOdometerController.text);

      if (!isStartLogged) {
        if (startVal == null) return;
        if (_startPhoto == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please capture Start-of-Day odometer photo'),
              backgroundColor: AppColors.error,
            ),
          );
          return;
        }
        
        final bytes = await _startPhoto!.readAsBytes();
        final base64Image = base64Encode(bytes);

        final success = await widget.travelProvider.submitTravelLog(
          meterStart: startVal,
          proofImageBase64: base64Image,
          notes: 'Logged start-of-day odometer reading',
        );

        if (success && mounted) {
          widget.travelProvider.fetchTodayTravel();
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Travel log submitted successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (mounted) {
          final errorMsg = widget.travelProvider.errorMessage ?? 'Submission failed';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMsg),
              backgroundColor: AppColors.error,
            ),
          );
        }
      } else {
        // Logging End of Day
        if (endVal == null) return;
        if (_endPhoto == null) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Please capture End-of-Day odometer photo'),
              backgroundColor: AppColors.error,
            ),
          );
          return;
        }
        
        final bytes = await _endPhoto!.readAsBytes();
        final base64Image = base64Encode(bytes);

        final success = await widget.travelProvider.submitTravelLog(
          meterEnd: endVal,
          proofImageBase64: base64Image,
          notes: 'Logged end-of-day odometer reading',
        );

        if (success && mounted) {
          widget.travelProvider.fetchTodayTravel();
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Travel log submitted successfully'),
              backgroundColor: AppColors.success,
            ),
          );
        } else if (mounted) {
          final errorMsg = widget.travelProvider.errorMessage ?? 'Submission failed';
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMsg),
              backgroundColor: AppColors.error,
            ),
          );
        }
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Submission Error: $e'),
          backgroundColor: AppColors.error,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoadingTodayLog) {
      return Container(
        decoration: const BoxDecoration(
          color: AppColors.bgCard,
          borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(40),
        child: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    final log = widget.travelProvider.todayLog;
    final isStartLogged = log != null && log.meterStart != null;
    final isEndLogged = log != null && log.meterEnd != null;
    final rate = _getTravelRate();

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.bgCard,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: AppColors.border,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                isStartLogged ? 'Complete Today\'s Travel Log' : 'Start Today\'s Travel Log',
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),

              // 1. Start-of-Day Odometer Reading
              Text(
                'Start-of-Day Odometer Reading (KM)',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
              ),
              const SizedBox(height: 8),
              TextFormField(
                controller: _startOdometerController,
                keyboardType: TextInputType.number,
                enabled: !isStartLogged,
                style: GoogleFonts.inter(color: AppColors.textPrimary),
                decoration: modernInputDecoration(
                  hint: 'Enter start-of-day odometer reading',
                ).copyWith(
                  fillColor: isStartLogged ? AppColors.border : AppColors.bgInput,
                  filled: true,
                ),
                validator: (val) {
                  if (val == null || val.isEmpty) return 'Required';
                  if (double.tryParse(val) == null) return 'Invalid number';
                  return null;
                },
              ),
              const SizedBox(height: 16),

              // 2. Start-of-Day Odometer Photo
              if (!isStartLogged) ...[
                Text(
                  'Start-of-Day Odometer Photo',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () => _pickPhoto(true),
                    icon: Icon(_startPhoto != null ? Icons.check : Icons.camera_alt, size: 18),
                    label: Text(_startPhoto != null ? 'Photo Captured' : 'Upload Start-of-Day Photo', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _startPhoto != null ? AppColors.successSoft : AppColors.primarySoft,
                      foregroundColor: _startPhoto != null ? AppColors.success : AppColors.primary,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
                if (_startPhoto != null) ...[
                  const SizedBox(height: 8),
                  Center(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.file(
                        File(_startPhoto!.path),
                        height: 100,
                        width: 150,
                        fit: BoxFit.cover,
                      ),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
              ] else ...[
                Text(
                  'Start-of-Day Photo Status',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.successSoft,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.success.withOpacity(0.2)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                      const SizedBox(width: 8),
                      Text('Start-of-day odometer photo uploaded successfully', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
              ],

              // 3. End-of-Day Odometer Reading
              if (isStartLogged) ...[
                Text(
                  'End-of-Day Odometer Reading (KM)',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _endOdometerController,
                  keyboardType: TextInputType.number,
                  enabled: !isEndLogged,
                  style: GoogleFonts.inter(color: AppColors.textPrimary),
                  decoration: modernInputDecoration(
                    hint: 'Enter end-of-day odometer reading',
                  ).copyWith(
                    fillColor: isEndLogged ? AppColors.border : AppColors.bgInput,
                    filled: true,
                  ),
                  validator: (val) {
                    if (val == null || val.isEmpty) return 'Required';
                    if (double.tryParse(val) == null) return 'Invalid number';
                    return null;
                  },
                ),
                const SizedBox(height: 16),

                // 4. End-of-Day Odometer Photo
                if (!isEndLogged) ...[
                  Text(
                    'End-of-Day Odometer Photo',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => _pickPhoto(false),
                      icon: Icon(_endPhoto != null ? Icons.check : Icons.camera_alt, size: 18),
                      label: Text(_endPhoto != null ? 'Photo Captured' : 'Upload End-of-Day Photo', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _endPhoto != null ? AppColors.successSoft : AppColors.primarySoft,
                        foregroundColor: _endPhoto != null ? AppColors.success : AppColors.primary,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ),
                  if (_endPhoto != null) ...[
                    const SizedBox(height: 8),
                    Center(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(_endPhoto!.path),
                          height: 100,
                          width: 150,
                          fit: BoxFit.cover,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 8),
                ] else ...[
                  Text(
                    'End-of-Day Photo Status',
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.successSoft,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.success.withOpacity(0.2)),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.success, size: 20),
                        const SizedBox(width: 8),
                        Text('End-of-day odometer photo uploaded successfully', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 8),
                ],

                if (_validationError != null)
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8.0, top: 4.0),
                    child: Text(
                      _validationError!,
                      style: GoogleFonts.inter(color: AppColors.error, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ),
                const SizedBox(height: 20),

                // 5. Distance & Allowance Display
                Text(
                  'Distance & Allowance Calculation',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.primarySoft,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.primary.withOpacity(0.2)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total Traveled Distance:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary)),
                          Text(
                            '${_distance >= 0 ? _distance.toStringAsFixed(1) : "0.0"} KM',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.primary),
                          ),
                        ],
                      ),
                      const Divider(height: 20, color: AppColors.border),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Rate per KM:', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                          Text(
                            '₹${rate.toStringAsFixed(2)} / KM',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Calculated Allowance Amount:', style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.success)),
                          Text(
                            '₹${(_distance >= 0 ? _distance * rate : 0.0).toStringAsFixed(2)}',
                            style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.success),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 24),
              ],

              // 6. Submit button
              if (!isEndLogged)
                CustomButton(
                  text: isStartLogged ? 'Complete Travel Log' : 'Save Start Odometer',
                  onPressed: _submit,
                  isLoading: widget.travelProvider.isSubmitting,
                ),
            ],
          ),
        ),
      ),
    );
  }
}
