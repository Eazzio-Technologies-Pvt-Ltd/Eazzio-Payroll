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
import '../widgets/animated_tap_button.dart';
import '../widgets/custom_text_field.dart';
import '../widgets/user_avatar.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/storage_helper.dart';
import '../core/utils/notification_helper.dart';
import '../core/utils/constants.dart';
import 'permissions_screen.dart';
import 'request_advance_screen.dart';
import '../core/utils/responsive.dart'; // Responsive helper — no hardcoded sizes
import '../widgets/animated_counter.dart';
import '../widgets/animated_card.dart';
import '../widgets/swipe_to_punch.dart';
import '../core/utils/salary_helper.dart';
import '../models/attendance_model.dart';

// Home screen v2 — premium card layouts + modern gradients
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isInit = true;
  bool _isLoading = false;
  Timer? _countUpTimer;
  String _travelFilter = '7'; // Default to 7 Days
  DateTimeRange? _customDateRange;
  DateTime _singleDate = DateTime.now();
  final String _analyticsFilter = 'single';
  DateTime? _selectedTimelineDate;
  bool _isPunchingIn = false;

  // ─────────────────────────── Time-based Greeting ─────────────────────────────
  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  String formatTotalWorkingHours(double totalHours) {
    final hours = totalHours.toInt();
    final minutes = ((totalHours - hours) * 60).round();
    return '${hours.toString().padLeft(2, '0')}h ${minutes.toString().padLeft(2, '0')}m';
  }

  @override
  void initState() {
    super.initState();
    // A 1-second ticker to support the live stopwatch style working hours timer
    _countUpTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
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
    if (mounted) {
      setState(() {
        _isLoading = true;
      });
    }

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
        attendanceProvider.fetchHistory().catchError((e) {
          debugPrint('Error fetching attendance history: $e');
          return null;
        }),
        attendanceProvider.fetchShifts().catchError((e) {
          debugPrint('Error fetching shifts: $e');
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

    if (mounted) {
      setState(() {
        _isLoading = false;
      });
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
      if (!mounted) return;
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
      if (!mounted) return;
      final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
      final result = await attendanceProvider.punchIn(position, selfieBase64: base64Selfie);

      if (mounted && result.success) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Resumed Check-In Successful!'),
            backgroundColor: AppColors.success,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      debugPrint('Error recovering lost selfie data: $e');
    }
  }

  Future<bool> _handleAttendanceAction() async {
    final attendanceProvider = Provider.of<AttendanceProvider>(context, listen: false);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final user = authProvider.currentUser;

    // 1. Verify location services are enabled
    final bool gpsEnabled = await Geolocator.isLocationServiceEnabled();
    if (!gpsEnabled) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("GPS is disabled. Please enable location services to proceed."),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return false;
    }

    // 2. Verify and request location permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
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
      return false;
    }

    final bool wasPunchedIn = attendanceProvider.isPunchedIn;

    // 3. Fetch current location BEFORE selfie (fail if GPS signal is weak)
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
    }

    if (position == null) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('GPS signal is too weak. Please ensure location services are enabled and try again.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return false;
    }

    // 4. Territory Check (Only for Punch-In)
    if (!wasPunchedIn) {
      if (user == null || user.territory == null || user.territory!.polygon == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("You don't have an assigned territory. Please contact your employer to get a territory assigned."),
              backgroundColor: AppColors.error,
              duration: Duration(seconds: 5),
            ),
          );
        }
        return false;
      }
      
      final polyData = user.territory!.polygon!;
      if (polyData['coordinates'] == null || polyData['coordinates'] is! List || (polyData['coordinates'] as List).isEmpty) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("You don't have an assigned territory. Please contact your employer to get a territory assigned."),
              backgroundColor: AppColors.error,
              duration: Duration(seconds: 5),
            ),
          );
        }
        return false;
      }
    }

    // Check battery level for Punch-In
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
        return false;
      }
    }

    // 5. Selfie Capture with Geo-Tag Watermark (Mandatory)
    String? base64Selfie;
    try {
      final String actionName = wasPunchedIn ? 'PUNCH_OUT' : 'PUNCH_IN';
      final String actionLabel = wasPunchedIn ? 'Punch Out' : 'Punch In';

      await StorageHelper.savePendingAction(actionName);
      if (!mounted) return false;
      
      final result = await ImageUploadUtil.pickAndCompressImage(
        context,
        cameraOnly: true,
        preferredCameraDevice: CameraDevice.front,
        latitude: position.latitude,
        longitude: position.longitude,
        employeeName: user?.name,
        employeeId: user?.employeeId,
      );
      
      await StorageHelper.savePendingAction(null);
      
      if (result == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Selfie photo is required to $actionLabel.')),
          );
        }
        return false;
      }

      base64Selfie = result.base64String;
    } catch (e) {
      await StorageHelper.savePendingAction(null);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Selfie capture failed: $e'), backgroundColor: AppColors.error),
        );
      }
      return false;
    }

    // 6. Geofence Boundary Check (To determine Inside/Outside status warning)
    bool isInside = true;
    if (user != null && user.territory != null && user.territory!.polygon != null) {
      final polyData = user.territory!.polygon!;
      if (polyData['coordinates'] != null && polyData['coordinates'] is List && (polyData['coordinates'] as List).isNotEmpty) {
        final coords = polyData['coordinates'][0] as List;
        double sumLat = 0;
        double sumLng = 0;
        int count = 0;
        
        for (var coord in coords) {
          if (coord is List && coord.length >= 2) {
            double lng = (coord[0] as num).toDouble();
            double lat = (coord[1] as num).toDouble();
            sumLat += lat;
            sumLng += lng;
            count++;
          }
        }
        
        if (count > 0) {
          double centroidLat = sumLat / count;
          double centroidLng = sumLng / count;
          
          bool inside = false;
          for (int i = 0, j = coords.length - 1; i < coords.length; j = i++) {
            final xi = (coords[i][0] as num).toDouble();
            final yi = (coords[i][1] as num).toDouble();
            final xj = (coords[j][0] as num).toDouble();
            final yj = (coords[j][1] as num).toDouble();
            
            final intersect = ((yi > position.latitude) != (yj > position.latitude)) &&
                (position.longitude < (xj - xi) * (position.latitude - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
          }
          
          isInside = inside;
          if (!isInside) {
            final double distance = Geolocator.distanceBetween(
              position.latitude,
              position.longitude,
              centroidLat,
              centroidLng,
            );
            if (distance > 100.0) {
              isInside = false;
            } else {
              isInside = true;
            }
          }
        }
      }
    }

    // 7. Execute Punch Action
    if (wasPunchedIn) {
      // Block punch-out if employee is outside assigned geofence
      if (!isInside) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("You are outside your assigned location. Please move inside your territory to punch out."),
              backgroundColor: AppColors.error,
              duration: Duration(seconds: 5),
            ),
          );
        }
        return false;
      }

      if (!mounted) return false;
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(
          child: CircularProgressIndicator(color: AppColors.primary),
        ),
      );

      final success = await attendanceProvider.punchOut(position, selfieBase64: base64Selfie);

      if (!mounted) return success;
      Navigator.pop(context);

      if (success) {
        await StorageHelper.savePunchOutTime(DateTime.now().toIso8601String());
        await StorageHelper.clearPunchInState();
        try {
          await NotificationHelper.showNewNotification(
            'Punch Out Successful',
            'You punched out at ${DateFormat('hh:mm a').format(DateTime.now())}.',
          );
        } catch (_) {}

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Punched Out Successfully!'),
              backgroundColor: AppColors.success,
            ),
          );
        }
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(attendanceProvider.errorMessage ?? 'Punch Out failed'),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return success;
    } else {
      if (!mounted) return false;

      setState(() {
        _isPunchingIn = true;
      });

      final result = await attendanceProvider.punchIn(position, selfieBase64: base64Selfie);

      if (!mounted) return result.success;

      setState(() {
        _isPunchingIn = false;
      });

      if (result.success) {
        try {
          await NotificationHelper.showNewNotification(
            'Punch In Successful',
            'You punched in at ${DateFormat('hh:mm a').format(DateTime.now())}.',
          );
        } catch (_) {}

        if (!isInside && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("You are outside your assigned location. Your selfie and location have been recorded."),
              backgroundColor: Colors.orange,
              duration: Duration(seconds: 4),
            ),
          );
        } else if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Punched In Successfully!'),
              backgroundColor: AppColors.success,
              duration: Duration(seconds: 3),
            ),
          );
        }

        Future.delayed(const Duration(seconds: 2), () {
          if (mounted) {
            attendanceProvider.fetchTodayState();
            attendanceProvider.fetchHistory();
          }
        });
      } else if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result.message),
            backgroundColor: AppColors.error,
          ),
        );
      }
      return result.success;
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
      firstPunchIn = StorageHelper.getPunchInTime();
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
        automaticallyImplyLeading: false,
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
              if (authUser?.role != 'ADMIN') ...[
              // ─── Punch Action Button ─────────────────────────────────
              (() {
                if (_isLoading) {
                  return const ShimmerSkeleton(height: 56);
                }
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

                if (!isPunchedIn && sessionCount == 0) {
                  buttonText = 'Swipe to Punch In (Session 1)';
                } else if (isPunchedIn && sessionCount == 1) {
                  buttonText = 'Swipe to Punch Out (Session 1)';
                } else if (!isPunchedIn && sessionCount == 1) {
                  buttonText = 'Swipe to Punch In (Session 2)';
                } else {
                  buttonText = 'Swipe to Punch Out (Session 2)';
                }

                return SwipeToPunch(
                  text: buttonText,
                  isPunchOut: isPunchedIn,
                  onConfirm: _handleAttendanceAction,
                  isLoading: _isPunchingIn || attendanceProvider.isLoading,
                );
              })(),
              const SizedBox(height: 20),

              // ─── 2b: Three-Card Punch Layout ──────────────────────────────
              _isLoading
                  ? Row(
                      children: [
                        Expanded(child: ShimmerSkeleton(height: 85)),
                        const SizedBox(width: 8),
                        Expanded(child: ShimmerSkeleton(height: 85)),
                        const SizedBox(width: 8),
                        Expanded(child: ShimmerSkeleton(height: 85)),
                      ],
                    )
                  : Row(
                      children: [
                        // Card 1: Punch In Time
                        Expanded(
                          child: AnimatedCard(
                            padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 8.0),
                            child: Column(
                              children: [
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Punch In Time',
                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
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
                                ),
                                const SizedBox(height: 4),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    firstPunchIn != null ? 'Started' : 'Not Active',
                                    style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                                  ),
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
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Punch Out Time',
                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
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
                                ),
                                const SizedBox(height: 4),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    lastPunchOut != null ? 'Completed' : 'Pending',
                                    style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                                  ),
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
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    'Hours Worked',
                                    style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    '${totalHours.toStringAsFixed(1)} hrs',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: (() {
                                    var shift = authUser?.shift;
                                    if (shift == null && attendanceProvider.shifts.isNotEmpty) {
                                      shift = attendanceProvider.shifts.first;
                                    }
                                    double targetHours = 9.0;
                                    if (shift != null) {
                                      try {
                                        final startParts = shift.startTime.split(':');
                                        final endParts = shift.endTime.split(':');
                                        final startMin = int.parse(startParts[0]) * 60 + int.parse(startParts[1]);
                                        final endMin = int.parse(endParts[0]) * 60 + int.parse(endParts[1]);
                                        int diffMin = endMin - startMin;
                                        if (diffMin < 0) {
                                          diffMin += 24 * 60; // Crossover midnight
                                        }
                                        targetHours = diffMin / 60.0;
                                      } catch (_) {}
                                    }
                                    final targetStr = targetHours.toStringAsFixed(1).replaceAll('.0', '');
                                    return Text(
                                      'Target: ${targetStr}h',
                                      style: GoogleFonts.inter(fontSize: 10, color: AppColors.textTertiary),
                                    );
                                  })(),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
              const SizedBox(height: 8),

              // ─── Blue WORKING HOURS Card ────────────────────
              (() {
                if (_isLoading) {
                  return const ShimmerSkeleton(height: 180);
                }
                final sessions = attendanceProvider.todaySessions;
                
                // Calculate today's live working hours if punched in
                Duration todayWorkDuration = Duration.zero;
                for (final session in sessions) {
                  final start = session.punchInTime;
                  final end = session.punchOutTime ?? DateTime.now();
                  if (start != null) {
                    todayWorkDuration += end.difference(start.toLocal());
                  }
                }
                
                // Calculate today's break duration
                Duration todayBreakDuration = Duration.zero;
                for (int i = 0; i < sessions.length - 1; i++) {
                  final outTime = sessions[i].punchOutTime;
                  final inTime = sessions[i+1].punchInTime;
                  if (outTime != null && inTime != null) {
                    todayBreakDuration += inTime.toLocal().difference(outTime.toLocal());
                  }
                }

                // Format live ticker or filtered hours
                String hoursText = '';
                String breakText = '';
                String captionText = '';

                final now = DateTime.now();
                final isToday = _singleDate.year == now.year &&
                    _singleDate.month == now.month &&
                    _singleDate.day == now.day;

                var activeShift = authUser?.shift;
                if (activeShift == null && attendanceProvider.shifts.isNotEmpty) {
                  activeShift = attendanceProvider.shifts.first;
                }
                final limitMin = activeShift?.breakDuration ?? 30;

                if (isToday) {
                  final hours = todayWorkDuration.inHours.toString().padLeft(2, '0');
                  final minutes = (todayWorkDuration.inMinutes % 60).toString().padLeft(2, '0');
                  final seconds = (todayWorkDuration.inSeconds % 60).toString().padLeft(2, '0');
                  hoursText = '$hours:$minutes:$seconds';
                  
                  final breakH = todayBreakDuration.inHours.toString().padLeft(2, '0');
                  final breakM = (todayBreakDuration.inMinutes % 60).toString().padLeft(2, '0');
                  breakText = '${breakH}h-${breakM}m / ${limitMin}m';
                  captionText = 'Hours worked today';
                } else {
                  final history = attendanceProvider.attendanceHistory;
                  final targetStart = DateTime(_singleDate.year, _singleDate.month, _singleDate.day);
                  final targetEnd = targetStart.add(const Duration(days: 1));
                  
                  final filteredLogs = history.where((log) => 
                    log.date.isAfter(targetStart.subtract(const Duration(seconds: 1))) &&
                    log.date.isBefore(targetEnd)
                  ).toList();
                  
                  final dateStr = DateFormat('dd MM yyyy').format(_singleDate);
                  captionText = 'Hours worked on $dateStr';

                  final totalHrs = filteredLogs.fold(0.0, (sum, log) => sum + (log.totalWorkingHours ?? 0.0));
                  final hoursInt = totalHrs.toInt();
                  final minutesInt = ((totalHrs - hoursInt) * 60).round();
                  hoursText = '${hoursInt.toString().padLeft(2, '0')}:${minutesInt.toString().padLeft(2, '0')}:00';
                  
                  final groupedLogs = <String, List<AttendanceModel>>{};
                  for (final log in filteredLogs) {
                    final dateKey = '${log.date.year}-${log.date.month}-${log.date.day}';
                    groupedLogs.putIfAbsent(dateKey, () => []).add(log);
                  }

                  Duration totalRangeBreakDuration = Duration.zero;
                  for (final key in groupedLogs.keys) {
                    final daySessions = groupedLogs[key]!;
                    daySessions.sort((a, b) {
                      if (a.punchInTime != null && b.punchInTime != null) {
                        return a.punchInTime!.compareTo(b.punchInTime!);
                      }
                      return a.sessionNumber.compareTo(b.sessionNumber);
                    });

                    for (int i = 0; i < daySessions.length - 1; i++) {
                      final outTime = daySessions[i].punchOutTime;
                      final inTime = daySessions[i + 1].punchInTime;
                      if (outTime != null && inTime != null) {
                        totalRangeBreakDuration += inTime.toLocal().difference(outTime.toLocal());
                      }
                    }
                  }

                  final breakH = totalRangeBreakDuration.inHours.toString().padLeft(2, '0');
                  final breakM = (totalRangeBreakDuration.inMinutes % 60).toString().padLeft(2, '0');
                  breakText = '${breakH}h-${breakM}m / ${limitMin}m';
                }

                return Stack(
                  children: [
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(20.0),
                      decoration: BoxDecoration(
                        gradient: AppTheme.headerGradient,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: [
                          BoxShadow(
                            color: AppColors.primary.withValues(alpha: 0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 6),
                          ),
                        ],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  'WORKING HOURS',
                                  style: GoogleFonts.inter(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w600,
                                    color: Colors.white.withValues(alpha: 0.8),
                                    letterSpacing: 1.0,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              InkWell(
                                onTap: () async {
                                  final picked = await showDatePicker(
                                    context: context,
                                    initialDate: _singleDate,
                                    firstDate: DateTime.now().subtract(const Duration(days: 365)),
                                    lastDate: DateTime.now(),
                                    builder: (context, child) {
                                      return Theme(
                                        data: Theme.of(context).copyWith(
                                          colorScheme: const ColorScheme.light(
                                            primary: AppColors.primary,
                                            onPrimary: Colors.white,
                                            onSurface: Colors.black,
                                          ),
                                        ),
                                        child: child!,
                                      );
                                    },
                                  );
                                  if (picked != null) {
                                    setState(() {
                                      _singleDate = picked;
                                      _selectedTimelineDate = DateTime(picked.year, picked.month, picked.day);
                                    });
                                  }
                                },
                                borderRadius: BorderRadius.circular(8),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white.withValues(alpha: 0.15),
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(
                                      color: Colors.white.withValues(alpha: 0.3),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.calendar_month_rounded,
                                        color: Colors.white,
                                        size: 14,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        DateFormat('dd MM yyyy').format(_singleDate),
                                        style: GoogleFonts.inter(
                                          fontSize: 12,
                                          color: Colors.white,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.baseline,
                            textBaseline: TextBaseline.alphabetic,
                            children: [
                              Text(
                                hoursText,
                                style: GoogleFonts.inter(
                                  fontSize: 36,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              const Icon(Icons.check, size: 14, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(
                                captionText,
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: Colors.white70,
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 32, color: Colors.white24),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.free_breakfast_rounded, size: 16, color: Colors.white),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Total Break Time',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                breakText,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(6),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.12),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Icon(Icons.schedule_rounded, size: 16, color: Colors.white),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Shift Timing',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.white.withValues(alpha: 0.9),
                                    fontWeight: FontWeight.w500,
                                  ),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
                              (() {
                                var shift = authUser?.shift;
                                if (shift == null && attendanceProvider.shifts.isNotEmpty) {
                                  shift = attendanceProvider.shifts.first;
                                }
                                String shiftText = '09:00 am - 06:00 pm';
                                if (shift != null) {
                                  String formatTime(String time24) {
                                    try {
                                      final parts = time24.split(':');
                                      final hour = int.parse(parts[0]);
                                      final minute = int.parse(parts[1]);
                                      final ampm = hour >= 12 ? 'pm' : 'am';
                                      final hour12 = hour % 12 == 0 ? 12 : hour % 12;
                                      final minStr = minute.toString().padLeft(2, '0');
                                      return '$hour12:$minStr $ampm';
                                    } catch (_) {
                                      return time24;
                                    }
                                  }
                                  shiftText = '${formatTime(shift.startTime)} - ${formatTime(shift.endTime)}';
                                }
                                return Text(
                                  shiftText,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                );
                              })(),
                            ],
                          ),
                        ],
                      ),
                    ),
                    Positioned.fill(
                      child: IgnorePointer(
                        child: CustomPaint(
                          painter: ConcentricCirclesPainter(),
                        ),
                      ),
                    ),
                  ],
                );
              })(),
              const SizedBox(height: 16),

              // ─── Your activity timeline Section ────────────────────
              (() {
                if (_isLoading) {
                  return const ShimmerSkeleton(height: 120);
                }
                final now = DateTime.now();
                final todayStart = DateTime(now.year, now.month, now.day);
                
                final datesToShow = <DateTime>[];
                if (_analyticsFilter == '7') {
                  for (int i = 0; i < 7; i++) {
                    datesToShow.add(todayStart.subtract(Duration(days: i)));
                  }
                } else if (_analyticsFilter == '6m') {
                  final activeDates = attendanceProvider.attendanceHistory
                      .map((log) => DateTime(log.date.year, log.date.month, log.date.day))
                      .toSet()
                      .toList();
                  activeDates.sort((a, b) => b.compareTo(a));
                  datesToShow.addAll(activeDates.take(15));
                } else if (_analyticsFilter == 'custom' && _customDateRange != null) {
                  final diff = _customDateRange!.end.difference(_customDateRange!.start).inDays;
                  final limit = diff.clamp(0, 31);
                  for (int i = 0; i <= limit; i++) {
                    datesToShow.add(DateTime(_customDateRange!.start.year, _customDateRange!.start.month, _customDateRange!.start.day).add(Duration(days: i)));
                  }
                  datesToShow.sort((a, b) => b.compareTo(a));
                }

                if (_selectedTimelineDate == null) {
                  if (_analyticsFilter == 'today') {
                    _selectedTimelineDate = todayStart;
                  } else if (_analyticsFilter == 'yesterday') {
                    _selectedTimelineDate = todayStart.subtract(const Duration(days: 1));
                  } else if (_analyticsFilter == 'single') {
                    _selectedTimelineDate = _singleDate;
                  } else if (datesToShow.isNotEmpty) {
                    _selectedTimelineDate = datesToShow.first;
                  } else {
                    _selectedTimelineDate = todayStart;
                  }
                }

                final targetDate = _selectedTimelineDate ?? todayStart;
                final isTargetToday = targetDate.year == todayStart.year &&
                    targetDate.month == todayStart.month &&
                    targetDate.day == todayStart.day;

                List<AttendanceModel> daySessions = [];
                if (isTargetToday) {
                  daySessions = attendanceProvider.todaySessions;
                } else {
                  daySessions = attendanceProvider.attendanceHistory.where((log) {
                    return log.date.year == targetDate.year &&
                           log.date.month == targetDate.month &&
                           log.date.day == targetDate.day;
                  }).toList();
                  daySessions.sort((a, b) {
                    if (a.punchInTime != null && b.punchInTime != null) {
                      return a.punchInTime!.compareTo(b.punchInTime!);
                    }
                    return a.sessionNumber.compareTo(b.sessionNumber);
                  });
                }

                final events = <_TimelineEvent>[];
                for (int i = 0; i < daySessions.length; i++) {
                  final session = daySessions[i];
                  if (session.punchInTime != null) {
                    events.add(_TimelineEvent(
                      type: 'in',
                      time: session.punchInTime!,
                      label: 'Punch In',
                    ));
                  }
                  if (session.punchOutTime != null) {
                    events.add(_TimelineEvent(
                      type: 'out',
                      time: session.punchOutTime!,
                      label: 'Punch Out',
                    ));
                  }
                  if (i < daySessions.length - 1) {
                    final nextSession = daySessions[i + 1];
                    if (session.punchOutTime != null && nextSession.punchInTime != null) {
                      final breakDur = nextSession.punchInTime!.difference(session.punchOutTime!);
                      if (breakDur.inMinutes > 0) {
                        events.add(_TimelineEvent(
                          type: 'break',
                          time: session.punchOutTime!,
                          label: '${breakDur.inMinutes} Min Break',
                          breakDuration: breakDur,
                        ));
                      }
                    }
                  }
                }

                return Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFEFF6FF),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(
                            Icons.trending_up_rounded,
                            color: Color(0xFF2563EB),
                            size: 16,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          "Your activity",
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (datesToShow.isNotEmpty)
                      Container(
                        height: 64,
                        margin: const EdgeInsets.only(bottom: 12),
                        child: ListView.builder(
                          scrollDirection: Axis.horizontal,
                          itemCount: datesToShow.length,
                          itemBuilder: (context, idx) {
                            final date = datesToShow[idx];
                            final isSelected = targetDate.year == date.year &&
                                targetDate.month == date.month &&
                                targetDate.day == date.day;
                                
                            final dayName = DateFormat('E').format(date);
                            final dayNum = DateFormat('dd').format(date);
                            
                            return GestureDetector(
                              onTap: () {
                                setState(() {
                                  _selectedTimelineDate = date;
                                });
                              },
                              child: AnimatedContainer(
                                duration: const Duration(milliseconds: 200),
                                width: 50,
                                margin: const EdgeInsets.only(right: 8),
                                decoration: BoxDecoration(
                                  color: isSelected ? AppColors.primary : AppColors.bgCard,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isSelected ? AppColors.primary : AppColors.border,
                                    width: 1,
                                  ),
                                  boxShadow: isSelected ? [
                                    BoxShadow(
                                      color: AppColors.primary.withValues(alpha: 0.2),
                                      blurRadius: 6,
                                      offset: const Offset(0, 3),
                                    )
                                  ] : null,
                                ),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(
                                      dayName,
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                        color: isSelected ? Colors.white70 : AppColors.textSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      dayNum,
                                      style: GoogleFonts.inter(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: isSelected ? Colors.white : AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    AnimatedSize(
                      duration: const Duration(milliseconds: 300),
                      curve: Curves.easeInOut,
                      child: AnimatedSwitcher(
                        duration: const Duration(milliseconds: 300),
                        transitionBuilder: (Widget child, Animation<double> animation) {
                          return FadeTransition(
                            opacity: animation,
                            child: SlideTransition(
                              position: Tween<Offset>(
                                begin: const Offset(0, 0.05),
                                end: Offset.zero,
                              ).animate(animation),
                              child: child,
                            ),
                          );
                        },
                        child: AnimatedCard(
                          key: ValueKey<String>('timeline_${targetDate.year}_${targetDate.month}_${targetDate.day}_${events.length}'),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          child: events.isEmpty
                              ? Center(
                                  child: Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 24),
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(
                                          Icons.calendar_today_rounded,
                                          size: 32,
                                          color: AppColors.textTertiary,
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          'No activity logged for this day',
                                          style: GoogleFonts.inter(
                                            fontSize: 13,
                                            fontWeight: FontWeight.w500,
                                            color: AppColors.textSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                )
                              : Column(
                                  children: List.generate(events.length, (idx) {
                                    final event = events[idx];
                                    
                                    if (event.type == 'break') {
                                      return Row(
                                        children: [
                                          SizedBox(
                                            width: 24,
                                            height: 40,
                                            child: Stack(
                                              alignment: Alignment.center,
                                              children: [
                                                Positioned(
                                                  top: 0,
                                                  bottom: 0,
                                                  left: 11,
                                                  child: Container(
                                                    width: 2,
                                                    color: AppColors.border,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Expanded(
                                                  child: Container(
                                                    height: 1,
                                                    color: AppColors.border,
                                                  ),
                                                ),
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                  decoration: BoxDecoration(
                                                    color: const Color(0xFFFFFBEB),
                                                    borderRadius: BorderRadius.circular(20),
                                                    border: Border.all(color: const Color(0xFFFDE68A)),
                                                  ),
                                                  child: Row(
                                                    mainAxisSize: MainAxisSize.min,
                                                    children: [
                                                      const Icon(
                                                        Icons.free_breakfast_rounded,
                                                        size: 12,
                                                        color: Color(0xFFD97706),
                                                      ),
                                                      const SizedBox(width: 6),
                                                      Text(
                                                        event.label,
                                                        style: GoogleFonts.inter(
                                                          fontSize: 11,
                                                          fontWeight: FontWeight.w600,
                                                          color: const Color(0xFFD97706),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                Expanded(
                                                  child: Container(
                                                    height: 1,
                                                    color: AppColors.border,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      );
                                    } else {
                                      final isPunchIn = event.type == 'in';
                                      final circleColor = isPunchIn ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE);
                                      final iconColor = isPunchIn ? AppColors.success : AppColors.error;
                                      final iconData = isPunchIn ? Icons.login_rounded : Icons.logout_rounded;
                                      
                                      return Row(
                                        crossAxisAlignment: CrossAxisAlignment.center,
                                        children: [
                                          SizedBox(
                                            width: 24,
                                            height: 48,
                                            child: Stack(
                                              alignment: Alignment.center,
                                              children: [
                                                if (events.length > 1)
                                                  Positioned(
                                                    top: idx == 0 ? 24 : 0,
                                                    bottom: idx == events.length - 1 ? 24 : 0,
                                                    left: 11,
                                                    child: Container(
                                                      width: 2,
                                                      color: AppColors.border,
                                                    ),
                                                  ),
                                                Container(
                                                  width: 24,
                                                  height: 24,
                                                  decoration: BoxDecoration(
                                                    color: circleColor,
                                                    shape: BoxShape.circle,
                                                  ),
                                                  child: Icon(
                                                    iconData,
                                                    color: iconColor,
                                                    size: 13,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                          const SizedBox(width: 16),
                                          Expanded(
                                            child: Row(
                                              children: [
                                                Text(
                                                  event.label,
                                                  style: GoogleFonts.inter(
                                                    fontSize: 13,
                                                    fontWeight: FontWeight.w600,
                                                    color: AppColors.textPrimary,
                                                  ),
                                                ),
                                                const Spacer(),
                                                Text(
                                                  DateFormat('hh:mm a').format(event.time.toLocal()).toLowerCase(),
                                                  style: GoogleFonts.inter(
                                                    fontSize: 13,
                                                    color: AppColors.textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      );
                                    }
                                  }),
                                ),
                        ),
                      ),
                    ),
                  ],
                );
              })(),
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
                                      separatorBuilder: (_, index) => const Divider(height: 8),
                                      itemBuilder: (context, index) {
                                        final log = filteredLogs[index];
                                        return Row(
                                          children: [
                                            Expanded(
                                              flex: 3,
                                              child: Text(
                                                DateFormat('dd MMM').format(log.date.toLocal()),
                                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                                              ),
                                            ),
                                            Expanded(
                                              flex: 2,
                                              child: Text(
                                                '${log.totalDistanceKm.toStringAsFixed(0)} KM',
                                                style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                                                textAlign: TextAlign.center,
                                              ),
                                            ),
                                            Expanded(
                                              flex: 2,
                                              child: Text(
                                                '₹${log.allowanceAmount.toStringAsFixed(0)}',
                                                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.success),
                                                textAlign: TextAlign.end,
                                              ),
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

                      // Calculate daily salary components using dynamic monthly working days (excluding Sundays)
                      final dynamicWorkingDays = getWorkingDaysInMonth(DateTime.now());
                      final dailySalaryRate = baseSalary / dynamicWorkingDays;

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
                            separatorBuilder: (_, index) => const Divider(height: 8),
                            itemBuilder: (context, index) {
                              final gLog = groupedLogs[index];
                              final isPayable = gLog['isPayable'] as bool;
                              final dailySalary = gLog['dailySalary'] as double;
                              final date = gLog['date'] as DateTime;
                              final totalHours = gLog['totalHours'] as double;

                              return Row(
                                children: [
                                  Expanded(
                                    flex: 4,
                                    child: Text(
                                      DateFormat('dd MMM yyyy').format(date),
                                      style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: AppColors.textPrimary),
                                    ),
                                  ),
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      '${totalHours.toStringAsFixed(1)} hrs',
                                      style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary),
                                      textAlign: TextAlign.center,
                                    ),
                                  ),
                                  Expanded(
                                    flex: 3,
                                    child: Text(
                                      '₹${dailySalary.toStringAsFixed(2)}',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: isPayable ? AppColors.success : AppColors.error,
                                      ),
                                      textAlign: TextAlign.end,
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
                              Expanded(
                                child: Text(
                                  'Accrued Salary (This Month):',
                                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              const SizedBox(width: 8),
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
                                  color: AppColors.accent.withValues(alpha: 0.20),
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
              ] else ...[
                const SizedBox(height: 24),
                AnimatedCard(
                  child: Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: const BoxDecoration(
                                color: AppColors.primarySoft,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.admin_panel_settings,
                                color: AppColors.primary,
                                size: 28,
                              ),
                            ),
                            const SizedBox(width: 16),
                            Text(
                              'Employer Control Panel',
                              style: GoogleFonts.inter(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'You are logged in as the Organization Administrator (Employer). On this panel, you can manage system tasks, review payroll metrics, and oversee the entire field workforce.',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                            height: 1.5,
                          ),
                        ),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: ElevatedButton.icon(
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: AppColors.onPrimary,
                                  elevation: 0,
                                ),
                                onPressed: () {
                                  Navigator.pushNamed(context, '/tasks');
                                },
                                icon: const Icon(Icons.assignment),
                                label: const Text('Manage Tasks'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
              ],
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
      if (!mounted) return;
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
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
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
                AnimatedTapButton(
                  onTap: () => _pickPhoto(true),
                  child: Container(
                    width: double.infinity,
                    height: 48,
                    decoration: BoxDecoration(
                      color: _startPhoto != null ? AppColors.successSoft : AppColors.primarySoft,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: _startPhoto != null ? AppColors.success.withValues(alpha: 0.3) : AppColors.primary.withValues(alpha: 0.3),
                        width: 1.5,
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(_startPhoto != null ? Icons.check : Icons.camera_alt, 
                          color: _startPhoto != null ? AppColors.success : AppColors.primary, 
                          size: 18
                        ),
                        const SizedBox(width: 8),
                        Text(
                          _startPhoto != null ? 'Photo Captured' : 'Upload Start-of-Day Photo', 
                          style: GoogleFonts.inter(
                            fontWeight: FontWeight.bold,
                            color: _startPhoto != null ? AppColors.success : AppColors.primary,
                            fontSize: 14,
                          ),
                        ),
                      ],
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
                    border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
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
                  AnimatedTapButton(
                    onTap: () => _pickPhoto(false),
                    child: Container(
                      width: double.infinity,
                      height: 48,
                      decoration: BoxDecoration(
                        color: _endPhoto != null ? AppColors.successSoft : AppColors.primarySoft,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: _endPhoto != null ? AppColors.success.withValues(alpha: 0.3) : AppColors.primary.withValues(alpha: 0.3),
                          width: 1.5,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(_endPhoto != null ? Icons.check : Icons.camera_alt, 
                            color: _endPhoto != null ? AppColors.success : AppColors.primary, 
                            size: 18
                          ),
                          const SizedBox(width: 8),
                          Text(
                            _endPhoto != null ? 'Photo Captured' : 'Upload End-of-Day Photo', 
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.bold,
                              color: _endPhoto != null ? AppColors.success : AppColors.primary,
                              fontSize: 14,
                            ),
                          ),
                        ],
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
                      border: Border.all(color: AppColors.success.withValues(alpha: 0.2)),
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
                    border: Border.all(color: AppColors.primary.withValues(alpha: 0.2)),
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

class ConcentricCirclesPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = Colors.white.withValues(alpha: 0.06)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;

    // Draw multiple concentric circles originating from top-right corner
    final center = Offset(size.width * 1.1, size.height * -0.1);
    canvas.drawCircle(center, size.width * 0.3, paint);
    canvas.drawCircle(center, size.width * 0.5, paint);
    canvas.drawCircle(center, size.width * 0.7, paint);
    canvas.drawCircle(center, size.width * 0.9, paint);
    canvas.drawCircle(center, size.width * 1.1, paint);
    canvas.drawCircle(center, size.width * 1.3, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class _TimelineEvent {
  final String type; // 'in', 'out', 'break'
  final DateTime time;
  final String label;
  final Duration? breakDuration;
  _TimelineEvent({
    required this.type,
    required this.time,
    required this.label,
    this.breakDuration,
  });
}

class ShimmerSkeleton extends StatefulWidget {
  final double height;
  final double width;
  final double borderRadius;

  const ShimmerSkeleton({
    super.key,
    required this.height,
    this.width = double.infinity,
    this.borderRadius = 12,
  });

  @override
  State<ShimmerSkeleton> createState() => _ShimmerSkeletonState();
}

class _ShimmerSkeletonState extends State<ShimmerSkeleton> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    )..repeat(reverse: true);
    _opacityAnimation = Tween<double>(begin: 0.35, end: 0.65).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _opacityAnimation,
      builder: (context, child) {
        return Opacity(
          opacity: _opacityAnimation.value,
          child: Container(
            height: widget.height,
            width: widget.width,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(widget.borderRadius),
            ),
          ),
        );
      },
    );
  }
}
