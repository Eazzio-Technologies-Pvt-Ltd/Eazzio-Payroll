// UI/UX v2 — modern premium design — Antigravity 2026
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:image_picker/image_picker.dart';
import '../providers/auth_provider.dart';
import '../utils/image_upload_util.dart';
import '../providers/travel_provider.dart';
import '../widgets/custom_button.dart';
import '../widgets/user_avatar.dart';
import '../core/theme/app_theme.dart';
import 'expenses_screen.dart';
import 'feedback_screen.dart';
import 'permissions_screen.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        final travelProv = Provider.of<TravelProvider>(context, listen: false);
        travelProv.fetchMonthlySummary();
        travelProv.fetchTravelHistory(limit: 30);
      }
    });
  }

  Future<void> _handleLogout(BuildContext context) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    await authProvider.logout();
    if (context.mounted) {
      Navigator.pushNamedAndRemoveUntil(context, '/login', (route) => false);
    }
  }

  Future<void> _uploadPhoto(BuildContext context) async {
    final result = await ImageUploadUtil.pickAndCompressImage(
      context,
      cameraOnly: true,
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
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final success = await authProvider.uploadProfileImage(base64Image);

      if (context.mounted) {
        Navigator.pop(context); // Pop loading spinner
        if (success) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Profile photo uploaded and locked successfully!')),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(authProvider.errorMessage ?? 'Upload failed.')),
          );
        }
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context); // Pop loading spinner
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('An error occurred: $e')),
        );
      }
    }
  }

  Widget _buildStatCard(IconData icon, String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0), width: 0.8),
        ),
        child: Column(
          children: [
            Icon(icon, color: AppColors.primary, size: 20),
            const SizedBox(height: 8),
            Text(
              value,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              label,
              style: const TextStyle(
                fontSize: 11,
                color: AppColors.onSurfaceVariant,
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
              color: AppColors.primary.withOpacity(0.08),
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
                  style: const TextStyle(fontSize: 11, color: AppColors.onSurfaceVariant),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.onSurface),
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
          color: AppColors.primary.withOpacity(0.08),
          shape: BoxShape.circle,
        ),
        child: Icon(icon, color: AppColors.primary, size: 18),
      ),
      title: Text(
        title,
        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.onSurface),
      ),
      trailing: const Icon(Icons.chevron_right, color: AppColors.outline),
      onTap: onTap,
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
      backgroundColor: AppColors.background,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Overlapping Header Design
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 220,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFF070425), Color(0xFF1B0F85)],
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                    ),
                  ),
                ),
                Positioned(
                  bottom: -44,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Stack(
                      children: [
                        Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 4),
                          ),
                          child: UserAvatar(
                            radius: 44,
                            photoUrl: authUser?.profileImage,
                            name: authUser?.name ?? 'Employee',
                          ),
                        ),
                        if (authUser?.profileImage == null || authUser?.profileImageLockedAt == null)
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: CircleAvatar(
                              radius: 14,
                              backgroundColor: AppColors.primary,
                              child: IconButton(
                                padding: EdgeInsets.zero,
                                icon: const Icon(Icons.camera_alt, size: 14, color: Colors.white),
                                onPressed: () => _uploadPhoto(context),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 56),

            // User Info Details
            Text(
              authUser?.name ?? 'Employee Name',
              style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppColors.onSurface,
                  ),
            ),
            const SizedBox(height: 4),
            Text(
              authUser?.role.replaceAll('_', ' ').toUpperCase() ?? 'STAFF',
              style: const TextStyle(
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
            const SizedBox(height: 20),

            // Profile Tile Details Container
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Container(
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 0.8),
                ),
                child: Column(
                  children: [
                    if (authUser?.employeeId != null) ...[
                      _buildProfileRowItem(Icons.perm_identity_outlined, 'Employee ID', authUser!.employeeId!),
                      const Divider(height: 1, color: Color(0xFFE8E8F0)),
                    ],
                    _buildProfileRowItem(Icons.business_outlined, 'Organization', authUser?.organization?.name ?? 'Not Assigned'),
                    const Divider(height: 1, color: Color(0xFFE8E8F0)),
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
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFFE2E8F0), width: 0.8),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Salary & Allowance Configuration',
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: AppColors.primary,
                              fontWeight: FontWeight.bold,
                            ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Base Salary (Monthly)',
                            style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                          ),
                          Text(
                            authUser.baseSalary != null ? '₹${authUser.baseSalary!.toStringAsFixed(2)}' : 'Not Configured',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Divider(color: Color(0xFFE8E8F0), height: 1),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Travel Allowance Rate',
                            style: TextStyle(color: AppColors.onSurfaceVariant, fontSize: 13),
                          ),
                          Text(
                            '₹${authUser.travelAllowanceRate?.toStringAsFixed(2) ?? '4.00'}/KM',
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              color: AppColors.onSurface,
                            ),
                          ),
                        ],
                      ),
                      if (authUser.baseSalary != null) ...[
                        const SizedBox(height: 8),
                        const Divider(color: Color(0xFFE8E8F0), height: 1),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Accrued Salary (This Month)',
                                  style: TextStyle(color: AppColors.onSurface, fontSize: 13, fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  'Based on $present worked days this month',
                                  style: const TextStyle(color: AppColors.onSurfaceVariant, fontSize: 10),
                                ),
                              ],
                            ),
                            Text(
                              '₹${accruedSalary.toStringAsFixed(2)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 16,
                                color: AppColors.secondary,
                              ),
                            ),
                          ],
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
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0), width: 0.8),
                ),
                child: Column(
                  children: [
                    _buildNavigationRowItem(
                      icon: Icons.time_to_leave,
                      title: 'Leave Details',
                      onTap: () => Navigator.pushNamed(context, '/leave-details'),
                    ),
                    const Divider(height: 1, color: Color(0xFFE8E8F0)),
                    _buildNavigationRowItem(
                      icon: Icons.receipt_long,
                      title: 'My Expense Claims',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ExpensesScreen()),
                      ),
                    ),
                    const Divider(height: 1, color: Color(0xFFE8E8F0)),
                    _buildNavigationRowItem(
                      icon: Icons.feedback_outlined,
                      title: 'Anonymous Feedback',
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const FeedbackScreen()),
                      ),
                    ),
                    const Divider(height: 1, color: Color(0xFFE8E8F0)),
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
                height: 50,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: const BorderSide(color: AppColors.error, width: 1.2),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                  onPressed: () => _handleLogout(context),
                  child: const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.logout, size: 18),
                      SizedBox(width: 8),
                      Text('Log Out', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}
