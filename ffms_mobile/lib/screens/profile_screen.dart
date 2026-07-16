import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:io';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';
import '../providers/auth_provider.dart';
import '../utils/image_upload_util.dart';
import '../providers/travel_provider.dart';
import '../widgets/user_avatar.dart';
import '../core/theme/app_theme.dart';
import 'expenses_screen.dart';
import 'feedback_screen.dart';
import 'permissions_screen.dart';
import '../core/utils/salary_helper.dart';
import '../providers/attendance_provider.dart';
import '../services/api_service.dart';
import 'package:intl/intl.dart';
import 'package:open_filex/open_filex.dart';


// Profile screen v2 — gradient header + modern stat cards + clean settings list
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  bool _isLoggingOut = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 400),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.06),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animController,
      curve: Curves.easeOut,
    ));
    _animController.forward();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final travelProv = Provider.of<TravelProvider>(context, listen: false);
        travelProv.fetchMonthlySummary();
        travelProv.fetchTravelHistory(limit: 30);
      }
    });
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  void _handleLogout(BuildContext context) {
    // Guard against multiple rapid taps
    if (_isLoggingOut) return;
    _isLoggingOut = true;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    // logout() is now synchronous — clears local state instantly
    authProvider.logout();

    // Navigate immediately without waiting for any network call
    if (context.mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/role_selection', (route) => false);
    }
  }

  Future<void> _downloadSalarySlip(BuildContext context, String monthStr, DateTime date) async {
    final monthQuery = DateFormat('yyyy-MM').format(date);
    final authProvider = context.read<AuthProvider>();
    final currentUser = authProvider.currentUser;
    final userId = currentUser?.id;
    if (userId == null) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Session expired. Please log in again.')),
        );
      }
      return;
    }

    // Show loading SnackBar BEFORE the try block
    // so finally{} can always clear it — regardless of how we exit
    if (context.mounted) {
      ScaffoldMessenger.of(context).clearSnackBars();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
              ),
              const SizedBox(width: 15),
              Expanded(child: Text('Preparing salary slip for $monthStr...')),
            ],
          ),
          backgroundColor: AppColors.primary,
          duration: const Duration(seconds: 40), // Enough time for download
        ),
      );
    }

    String? successMessage;
    String? errorMessage;

    try {
      // 1. Check / request storage permission (version-aware)
      if (Platform.isAndroid) {
        final hasPermission = await _requestStoragePermission(context);
        if (!hasPermission) return; // finally{} will clear the SnackBar
      }

      // 2. Resolve save directory
      Directory? directory;
      if (Platform.isAndroid) {
        directory = await getExternalStorageDirectory();
        if (directory == null || !await directory.exists()) {
          directory = await getApplicationDocumentsDirectory();
        }
      } else {
        directory = await getApplicationDocumentsDirectory();
      }

      final monthName = DateFormat('MMMM').format(date);
      final yearStr = DateFormat('yyyy').format(date);
      final empNameClean = (currentUser?.name ?? 'Employee').replaceAll(' ', '_');
      final empIdClean = (currentUser?.employeeId ?? 'ID').replaceAll(' ', '_');
      final String fileName = '${empNameClean}_${empIdClean}_${monthName}_$yearStr.pdf';
      final String filePath = '${directory.path}/$fileName';

      // 3. Download PDF bytes — 30 second timeout
      final response = await ApiService.client.get(
        '/salary/slip/$userId',
        queryParameters: {'month': monthQuery},
        options: Options(
          responseType: ResponseType.bytes,
          sendTimeout: const Duration(seconds: 30),
          receiveTimeout: const Duration(seconds: 30),
        ),
      );

      // 4. Write to file
      final file = File(filePath);
      await file.writeAsBytes(response.data as List<int>);

      successMessage = 'Salary slip downloaded and opened successfully ✓';

      // 5. Auto-open PDF file on screen
      try {
        await OpenFilex.open(filePath);
      } catch (openErr) {
        debugPrint('Error opening downloaded file: $openErr');
      }

    } on DioException catch (dioErr) {
      final statusCode = dioErr.response?.statusCode;
      if (statusCode == 403) {
        errorMessage = 'Access denied. Contact your HR administrator to enable salary slips.';
      } else if (statusCode == 404) {
        errorMessage = 'Salary slip for $monthStr is not yet generated.';
      } else if (dioErr.type == DioExceptionType.connectionTimeout ||
          dioErr.type == DioExceptionType.receiveTimeout) {
        errorMessage = 'Download timed out. Please check your connection and try again.';
      } else if (dioErr.type == DioExceptionType.connectionError) {
        errorMessage = 'No internet connection. Please try again when online.';
      } else {
        errorMessage = 'Download failed (${statusCode ?? 'unknown error'}). Please try again.';
      }
    } catch (e) {
      errorMessage = 'Something went wrong: ${e.toString().split('\n').first}';
    } finally {
      // ALWAYS clear the loading SnackBar — no matter how we exit
      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        if (successMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(successMessage!),
              backgroundColor: AppColors.success,
              duration: const Duration(seconds: 4),
            ),
          );
        } else if (errorMessage != null) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(errorMessage!),
              backgroundColor: AppColors.error,
              duration: const Duration(seconds: 5),
            ),
          );
        }
      }
    }
  }


  /// Handles Android storage permission across all API levels:
  /// - API < 29  (Android 9-):   Requests READ/WRITE_EXTERNAL_STORAGE
  /// - API 29-32 (Android 10-12): Requests READ_EXTERNAL_STORAGE (WRITE no longer grantable)
  /// - API 33+   (Android 13+):  No storage permission needed — scoped Downloads via MediaStore
  /// Handles permanently denied state by showing an open-settings dialog.
  Future<bool> _requestStoragePermission(BuildContext context) async {
    // Detect Android SDK version
    int sdkVersion = 0;
    try {
      final androidInfo = await DeviceInfoPlugin().androidInfo;
      sdkVersion = androidInfo.version.sdkInt;
    } catch (e) {
      debugPrint('[StoragePermission] Could not get SDK version: $e');
    }

    // Android 13+ (API 33+): No storage permission needed for Downloads folder
    if (sdkVersion >= 33) {
      return true;
    }

    // Android 10-12 (API 29-32): Only READ_EXTERNAL_STORAGE is relevant
    // Android <= 9  (API < 29):  Use full Permission.storage (READ + WRITE)
    final Permission permissionToRequest =
        sdkVersion >= 29 ? Permission.photos : Permission.storage;

    PermissionStatus status = await permissionToRequest.status;

    // Already granted — proceed immediately
    if (status.isGranted) return true;

    // Permanently denied (user tapped "Never ask again")
    // Must direct them to App Settings to re-enable manually
    if (status.isPermanentlyDenied) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        await _showOpenSettingsDialog(context);
      }
      return false;
    }

    // Request the permission — shows the system permission dialog
    status = await permissionToRequest.request();

    if (status.isGranted) return true;

    // User denied (tapped "Deny" but not "Never ask again")
    if (status.isDenied) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Text('Storage permission is required to download salary slips.'),
            backgroundColor: AppColors.warning,
            action: SnackBarAction(
              label: 'Allow',
              textColor: Colors.white,
              onPressed: () async {
                await permissionToRequest.request();
              },
            ),
          ),
        );
      }
      return false;
    }

    // Became permanently denied after the dialog — open settings
    if (status.isPermanentlyDenied) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).clearSnackBars();
        await _showOpenSettingsDialog(context);
      }
      return false;
    }

    return false;
  }

  /// Shows a clear dialog explaining why the permission is needed
  /// and offers a direct "Open Settings" button to fix it
  Future<void> _showOpenSettingsDialog(BuildContext context) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext dialogContext) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: AppColors.errorSoft,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.folder_off_rounded, color: AppColors.error, size: 20),
              ),
              const SizedBox(width: 12),
              const Expanded(
                child: Text(
                  'Storage Permission Required',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          content: const Text(
            'You have permanently denied storage permission.\n\n'
            'To download salary slips, please enable "Storage" or '
            '"Files and media" permission in App Settings.',
            style: TextStyle(fontSize: 14, height: 1.5),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel', style: TextStyle(color: AppColors.textTertiary)),
            ),
            ElevatedButton.icon(
              onPressed: () async {
                Navigator.of(dialogContext).pop();
                await openAppSettings(); // Opens device App Settings for this app
              },
              icon: const Icon(Icons.settings_rounded, size: 16),
              label: const Text('Open Settings'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
            ),
          ],
        );
      },
    );
  }

  List<DateTime> _getAvailableSalarySlipMonths() {
    final List<DateTime> list = [];
    final now = DateTime.now();
    
    // Slips are generated on the 10th of the month for the previous month.
    // If today is >= 10th, previous month (now.month - 1) is available.
    // If today is < 10th, the month before previous month (now.month - 2) is available.
    DateTime latestAvailableMonth;
    if (now.day >= 10) {
      latestAvailableMonth = DateTime(now.year, now.month - 1, 1);
    } else {
      latestAvailableMonth = DateTime(now.year, now.month - 2, 1);
    }

    for (int i = 0; i < 12; i++) {
      final date = DateTime(latestAvailableMonth.year, latestAvailableMonth.month - i, 1);
      if (date.year >= 2024) {
        list.add(date);
      }
    }
    return list;
  }

  void _showSalarySlipsDialog(BuildContext context) {
    final availableMonths = _getAvailableSalarySlipMonths();
    // Capture the OUTER Scaffold context here — before the dialog opens.
    // The dialog builder's `context` parameter shadows this one and becomes
    // unmounted as soon as Navigator.pop() is called. SnackBars shown after
    // pop() must use this outer Scaffold context, not the dialog context.
    final scaffoldContext = context;

    showDialog(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          title: Row(
            children: [
              const Icon(Icons.picture_as_pdf_outlined, color: AppColors.primary),
              const SizedBox(width: 10),
              Text(
                'My Salary Slips',
                style: GoogleFonts.inter(
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                  color: AppColors.textPrimary,
                ),
              ),
            ],
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Salary slips are automatically generated on the 10th of every month for the previous month. Download your available slips below.',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 16),
                if (availableMonths.isEmpty)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    child: Center(
                      child: Text(
                        'No salary slips available yet.',
                        style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13),
                      ),
                    ),
                  )
                else
                  Flexible(
                    child: ListView.separated(
                      shrinkWrap: true,
                      itemCount: availableMonths.length,
                      separatorBuilder: (_, __) => Divider(height: 1, color: AppColors.border),
                      itemBuilder: (_, index) {
                        final date = availableMonths[index];
                        final monthStr = DateFormat('MMMM yyyy').format(date);
                        final periodStart = DateFormat('dd MMM yyyy').format(DateTime(date.year, date.month, 1));
                        final periodEnd = DateFormat('dd MMM yyyy').format(DateTime(date.year, date.month + 1, 0));
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.description_outlined, color: AppColors.primary),
                          title: Text(
                            monthStr,
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          subtitle: Text(
                            'Period: $periodStart – $periodEnd',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              color: AppColors.textSecondary,
                            ),
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.download_rounded, color: AppColors.primary),
                            onPressed: () {
                              // Close dialog first, then download using the
                              // OUTER scaffoldContext (still mounted after pop)
                              Navigator.pop(dialogContext);
                              _downloadSalarySlip(scaffoldContext, monthStr, date);
                            },
                          ),
                        );
                      },
                    ),
                  ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: Text(
                'Close',
                style: GoogleFonts.inter(color: AppColors.textSecondary, fontWeight: FontWeight.w600),
              ),
            ),
          ],
        );
      },
    );
  }

  Future<void> _uploadPhoto(BuildContext context) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final authUser = authProvider.currentUser;

    // Show custom bottom sheet to pick or remove image
    final option = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                margin: const EdgeInsets.symmetric(vertical: 10),
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8.0),
                child: Text(
                  'Profile Photo',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: AppColors.textPrimary,
                  ),
                ),
              ),
              const Divider(),
              ListTile(
                leading: const Icon(Icons.photo_camera, color: AppColors.primary),
                title: Text('Take Photo', style: GoogleFonts.inter(color: AppColors.textPrimary)),
                onTap: () => Navigator.pop(sheetContext, 'camera'),
              ),
              ListTile(
                leading: const Icon(Icons.photo_library, color: AppColors.primary),
                title: Text('Choose from Gallery', style: GoogleFonts.inter(color: AppColors.textPrimary)),
                onTap: () => Navigator.pop(sheetContext, 'gallery'),
              ),
              if (authUser?.profileImage != null)
                ListTile(
                  leading: const Icon(Icons.delete_outline, color: AppColors.error),
                  title: Text('Remove Photo', style: GoogleFonts.inter(color: AppColors.error)),
                  onTap: () => Navigator.pop(sheetContext, 'remove'),
                ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );

    if (!context.mounted) return;
    if (option == null) return;

    // Enforce backend constraint: once profile image is set, it cannot be changed or removed.
    if (authUser?.profileImageLockedAt != null || authUser?.profileImage != null) {
      final String actionText = option == 'remove' ? 'removed' : 'changed';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Profile photo is locked for security verification and cannot be $actionText.'),
          backgroundColor: AppColors.error,
        ),
      );
      return;
    }

    if (option == 'remove') {
      return;
    }

    final result = await ImageUploadUtil.pickAndCompressImage(
      context,
      cameraOnly: option == 'camera',
      preferredCameraDevice: CameraDevice.front,
    );

    if (result == null) return;

    if (!context.mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    try {
      final base64Image = result.base64String;
      final success = await authProvider.uploadProfileImage(base64Image);

      if (context.mounted) {
        Navigator.pop(context);
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile photo uploaded and locked successfully!'), backgroundColor: AppColors.success),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(authProvider.errorMessage ?? 'Upload failed.'), backgroundColor: AppColors.error),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('An error occurred: $e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Widget _buildStatCard(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: AppTheme.cardDecoration,
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(height: 8),
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 11,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileRowItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.primarySoft,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: AppColors.primary, size: 18),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(fontSize: 11, color: AppColors.textTertiary),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNavigationRowItem({
    required IconData icon,
    required String title,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        leading: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: AppColors.primarySoft,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, color: AppColors.primary, size: 18),
        ),
        title: Text(
          title,
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.textPrimary),
        ),
        trailing: const Icon(Icons.chevron_right, color: AppColors.textSecondary),
        onTap: onTap,
      ),
    );
  }

  Widget _buildSalaryStat(String label, String value, {Color? valueColor, String? sublabel}) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isNarrow = constraints.maxWidth < 280;
        
        final labelWidget = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: GoogleFonts.inter(
                color: AppColors.textSecondary,
                fontSize: 13,
                fontWeight: FontWeight.w500,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            if (sublabel != null) ...[
              const SizedBox(height: 2),
              Text(
                sublabel,
                style: GoogleFonts.inter(
                  color: AppColors.textTertiary,
                  fontSize: 10,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ],
        );

        final valueWidget = Text(
          value,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: valueColor ?? AppColors.textPrimary,
          ),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        );

        if (isNarrow) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              labelWidget,
              const SizedBox(height: 6),
              valueWidget,
            ],
          );
        }

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Expanded(
              child: labelWidget,
            ),
            const SizedBox(width: 16),
            Flexible(
              child: valueWidget,
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authUser = Provider.of<AuthProvider>(context).currentUser;
    final travelProvider = Provider.of<TravelProvider>(context);

    double accruedSalary = 0.0;
    final present = travelProvider.monthlySummary?.present ?? 0;
    final totalWorkingDays = travelProvider.monthlySummary?.totalWorkingDays ?? 0;
    final baseSalary = authUser?.baseSalary ?? 0.0;

    final dynamicWorkingDays = getWorkingDaysInMonth(DateTime.now());
    if (baseSalary > 0 && dynamicWorkingDays > 0) {
      final dailySalaryRate = baseSalary / dynamicWorkingDays;
      final logs = Provider.of<AttendanceProvider>(context).attendanceHistory;

      // Group sessions by date to prevent duplicate rows and sum/factor correctly
      final Map<String, List<dynamic>> groupedByDate = {};
      for (final log in logs) {
        final dateStr = DateFormat('yyyy-MM-dd').format(log.date);
        groupedByDate.putIfAbsent(dateStr, () => []).add(log);
      }

      int getStatusRank(String status) {
        final upper = status.toUpperCase();
        if (upper == 'PRESENT' || upper == 'ON_DUTY') return 4;
        if (upper == 'LATE') return 3;
        if (upper == 'HALF_DAY') return 2;
        if (upper == 'ABSENT') return 1;
        return 0;
      }

      for (final dateLogs in groupedByDate.values) {
        if (dateLogs.isEmpty) continue;

        // Sum total working hours for the date
        double totalHours = 0.0;
        bool isShiftCompleted = true;
        for (final l in dateLogs) {
          totalHours += l.totalWorkingHours ?? 0.0;
          if (l.punchOutTime == null) {
            isShiftCompleted = false;
          }
        }

        if (totalHours == 0.0 || !isShiftCompleted) {
          continue;
        }

        dynamic highestLog = dateLogs.first;
        int highestRank = getStatusRank(highestLog.status);
        for (final log in dateLogs) {
          final rank = getStatusRank(log.status);
          if (rank > highestRank) {
            highestRank = rank;
            highestLog = log;
          }
        }

        final finalStatus = highestLog.status.toUpperCase();
        double salaryFactor = 0.0;
        if (finalStatus == 'PRESENT' || finalStatus == 'ON_DUTY' || finalStatus == 'LATE') {
          salaryFactor = 1.0;
        } else if (finalStatus == 'HALF_DAY') {
          salaryFactor = 0.5;
        }

        accruedSalary += dailySalaryRate * salaryFactor;
      }
    }

    double attPct = totalWorkingDays > 0 ? (present / totalWorkingDays) * 100 : 100.0;
    final totalDistance = travelProvider.history.fold<double>(0.0, (sum, log) => sum + log.totalDistanceKm);

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        automaticallyImplyLeading: false,
        title: Text(
          'My Profile',
          style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: FadeTransition(
        opacity: _fadeAnim,
        child: SlideTransition(
          position: _slideAnim,
          child: SingleChildScrollView(
            child: Column(
          children: [
            // Overlapping Header with design system gradient
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 220,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    gradient: AppTheme.headerGradient,
                  ),
                ),
                Positioned(
                  bottom: -44,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Stack(
                      children: [
                        GestureDetector(
                          onTap: () => _uploadPhoto(context),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 4),
                                  boxShadow: [
                                    BoxShadow(
                                      color: AppColors.primary.withOpacity(0.2),
                                      blurRadius: 16,
                                      spreadRadius: 2,
                                      offset: const Offset(0, 4),
                                    ),
                                  ],
                                ),
                                child: UserAvatar(
                                  radius: 44,
                                  photoUrl: authUser?.profileImage,
                                  name: authUser?.name ?? 'Employee',
                                ),
                              ),
                              // Centered camera icon overlay on the avatar itself
                              Positioned.fill(
                                child: Container(
                                  margin: const EdgeInsets.all(4), // offset the 4px border
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    color: Colors.black.withValues(alpha: 0.3), // semi-transparent black overlay
                                  ),
                                  child: const Center(
                                    child: Icon(
                                      Icons.camera_alt_rounded,
                                      color: Colors.white,
                                      size: 24,
                                    ),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: GestureDetector(
                            onTap: () => _uploadPhoto(context),
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: AppColors.primary,
                              child: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 60),

            // User Name & Role
            Text(
              authUser?.name ?? 'Employee Name',
              style: GoogleFonts.inter(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              authUser?.role.replaceAll('_', ' ').toUpperCase() ?? 'STAFF',
              style: GoogleFonts.inter(
                color: AppColors.primary,
                fontWeight: FontWeight.bold,
                fontSize: 12,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),

            // Profile Tile Details Container
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Container(
                decoration: AppTheme.cardDecoration,
                child: Column(
                  children: [
                    if (authUser?.employeeId != null) ...[
                      _buildProfileRowItem(Icons.perm_identity_outlined, 'Employee ID', authUser!.employeeId!),
                      Divider(height: 1, color: AppColors.border),
                    ],
                    _buildProfileRowItem(Icons.business_outlined, 'Organization', authUser?.organization?.name ?? 'Not Assigned'),
                    Divider(height: 1, color: AppColors.border),
                    _buildProfileRowItem(Icons.location_on_outlined, 'Territory', authUser?.territory?.name ?? 'Not Assigned'),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Salary Info Container
            if (authUser != null)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: AppTheme.cardDecoration,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Salary & Allowance Configuration',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          color: AppColors.primary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 16),
                      _buildSalaryStat(
                        'Base Salary (Monthly)',
                        authUser.baseSalary != null ? '₹${authUser.baseSalary!.toStringAsFixed(2)}' : 'Not Configured',
                      ),
                      const SizedBox(height: 12),
                      Divider(height: 1, color: AppColors.border),
                      const SizedBox(height: 12),
                      _buildSalaryStat(
                        'Travel Allowance Rate',
                        '₹${authUser.travelAllowanceRate?.toStringAsFixed(2) ?? '4.00'}/KM',
                      ),
                      if (authUser.baseSalary != null) ...[
                        const SizedBox(height: 12),
                        Divider(height: 1, color: AppColors.border),
                        const SizedBox(height: 12),
                        _buildSalaryStat(
                          'Accrued Salary (This Month)',
                          '₹${accruedSalary.toStringAsFixed(2)}',
                          valueColor: AppColors.success,
                          sublabel: 'Based on $present worked days this month',
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 16),

            // Navigation Options
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Container(
                decoration: AppTheme.cardDecoration,
                child: Column(
                  children: [
                    _buildNavigationRowItem(
                      icon: Icons.time_to_leave,
                      title: 'Leave Details',
                      onTap: () => Navigator.pushNamed(context, '/leave-details'),
                    ),
                    Divider(height: 1, color: AppColors.border),
                    _buildNavigationRowItem(
                      icon: Icons.receipt_long,
                      title: 'My Expense Claims',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ExpensesScreen()),
                      ),
                    ),
                    Divider(height: 1, color: AppColors.border),
                    _buildNavigationRowItem(
                      icon: Icons.picture_as_pdf_outlined,
                      title: 'My Salary Slips',
                      onTap: () => _showSalarySlipsDialog(context),
                    ),
                    Divider(height: 1, color: AppColors.border),
                    _buildNavigationRowItem(
                      icon: Icons.feedback_outlined,
                      title: 'Anonymous Feedback',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const FeedbackScreen()),
                      ),
                    ),
                    Divider(height: 1, color: AppColors.border),
                    _buildNavigationRowItem(
                      icon: Icons.security_outlined,
                      title: 'System Permissions',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const PermissionsScreen()),
                      ),
                    ),
                    Divider(height: 1, color: AppColors.border),
                    _buildNavigationRowItem(
                      icon: Icons.alarm_rounded,
                      title: 'Punch Alarm Settings',
                      onTap: () => Navigator.pushNamed(context, '/alarm-settings'),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: SizedBox(
                width: double.infinity,
                height: 52,
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error, width: 1.2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppTheme.radiusMedium),
                    ),
                  ),
                  icon: const Icon(Icons.logout, size: 18),
                  label: Text(
                    'Log Out',
                    style: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  onPressed: _isLoggingOut ? null : () => _handleLogout(context),
                ),
              ),
            ),
            const SizedBox(height: 40),
          ],
        ),
      ),
    ),
    ),
    );
  }
}
