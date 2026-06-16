import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../utils/image_upload_util.dart';
import '../providers/travel_provider.dart';
import '../widgets/user_avatar.dart';
import '../core/theme/app_theme.dart';
import 'expenses_screen.dart';
import 'feedback_screen.dart';
import 'permissions_screen.dart';

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

  Future<void> _handleLogout(BuildContext context) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (context.mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
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
    return ListTile(
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
    );
  }

  Widget _buildSalaryStat(String label, String value, {Color? valueColor, String? sublabel}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: GoogleFonts.inter(color: AppColors.textSecondary, fontSize: 13)),
            if (sublabel != null) ...[
              const SizedBox(height: 2),
              Text(sublabel, style: GoogleFonts.inter(color: AppColors.textTertiary, fontSize: 10)),
            ],
          ],
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontWeight: FontWeight.bold,
            fontSize: 14,
            color: valueColor ?? AppColors.textPrimary,
          ),
        ),
      ],
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

    if (baseSalary > 0 && totalWorkingDays > 0) {
      accruedSalary = (present / totalWorkingDays) * baseSalary;
    } else if (baseSalary > 0 && present > 0) {
      accruedSalary = (present / 26.0) * baseSalary;
    }

    double attPct = totalWorkingDays > 0 ? (present / totalWorkingDays) * 100 : 100.0;
    final totalDistance = travelProvider.history.fold<double>(0.0, (sum, log) => sum + log.totalDistanceKm);

    return Scaffold(
      backgroundColor: AppColors.bgPage,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
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
            const SizedBox(height: 20),

            // Stats row cards
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Row(
                children: [
                  _buildStatCard(
                    Icons.calendar_today_outlined,
                    '${attPct.toStringAsFixed(0)}%',
                    'Attendance',
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    Icons.check_circle_outline,
                    '$present Days',
                    'Worked',
                  ),
                  const SizedBox(width: 12),
                  _buildStatCard(
                    Icons.directions_car_outlined,
                    '${totalDistance.toStringAsFixed(0)} KM',
                    'Travelled',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

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
                  onPressed: () => _handleLogout(context),
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
