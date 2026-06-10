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
        Provider.of<TravelProvider>(context, listen: false).fetchMonthlySummary();
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
    // Reusable image upload utility: checks camera permission, formats/sizes selfie under 1MB
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

  @override
  Widget build(BuildContext context) {
    final authUser = Provider.of<AuthProvider>(context).currentUser;
    final travelProvider = Provider.of<TravelProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
      ),
      body: SingleChildScrollView(
        child: Column(
          children: [
            // Header panel card
            Container(
              color: AppColors.surface,
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 16),
              child: Column(
                children: [
                  Stack(
                    children: [
                      UserAvatar(
                        radius: 48,
                        photoUrl: authUser?.profileImage,
                        name: authUser?.name ?? 'Employee',
                      ),
                      if (authUser?.profileImage == null || authUser?.profileImageLockedAt == null)
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: CircleAvatar(
                            radius: 16,
                            backgroundColor: AppColors.primary,
                            child: IconButton(
                              padding: EdgeInsets.zero,
                              icon: const Icon(Icons.camera_alt, size: 16, color: Colors.white),
                              onPressed: () => _uploadPhoto(context),
                            ),
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (authUser?.profileImage != null)
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.lock_outline, size: 12, color: AppColors.outline),
                        SizedBox(width: 4),
                        Text(
                          'Profile photo locked for verification.',
                          style: TextStyle(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  if (authUser?.profileImage == null)
                    const Text(
                      'Profile photo can only be uploaded once for security verification.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w500),
                    ),
                  const SizedBox(height: 16),
                  Text(
                    authUser?.name ?? 'Employee Name',
                    style: Theme.of(context).textTheme.headlineLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    authUser?.email ?? 'employee@example.com',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Profile info items list
            Container(
              color: AppColors.surface,
              child: Column(
                children: [
                  if (authUser?.employeeId != null)
                    _buildProfileTile(
                      Icons.perm_identity_outlined,
                      'Employee ID',
                      authUser!.employeeId!,
                    ),
                  _buildProfileTile(
                    Icons.badge_outlined,
                    'Employee Role',
                    authUser?.role.replaceAll('_', ' ').toUpperCase() ?? 'Staff',
                  ),
                  _buildProfileTile(
                    Icons.business_outlined,
                    'Organization',
                    authUser?.organization?.name ?? 'Not Assigned',
                  ),
                  _buildProfileTile(
                    Icons.location_on_outlined,
                    'Territory',
                    authUser?.territory?.name ?? 'Not Assigned',
                  ),
                  _buildProfileTile(
                    Icons.device_hub_outlined,
                    'System Status',
                    authUser?.status.toUpperCase() ?? 'ACTIVE',
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Salary & Allowance Card
            if (authUser != null) (() {
              double accruedSalary = 0.0;
              final present = travelProvider.monthlySummary?.present ?? 0;
              final totalWorkingDays = travelProvider.monthlySummary?.totalWorkingDays ?? 0;
              final baseSalary = authUser.baseSalary ?? 0.0;

              if (baseSalary > 0 && totalWorkingDays > 0) {
                accruedSalary = (present / totalWorkingDays) * baseSalary;
              } else if (baseSalary > 0 && present > 0) {
                accruedSalary = (present / 26.0) * baseSalary;
              }

              return Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.outlineVariant, width: 0.5),
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
                          style: TextStyle(color: AppColors.outline, fontSize: 13),
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
                    const Divider(color: AppColors.outlineVariant, height: 1),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Travel Allowance Rate',
                          style: TextStyle(color: AppColors.outline, fontSize: 13),
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
                      const Divider(color: AppColors.outlineVariant, height: 1),
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
                                style: const TextStyle(color: AppColors.outline, fontSize: 10),
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
              );
            })(),
            const SizedBox(height: 16),

            // Navigation shortcuts
            Container(
              color: AppColors.surface,
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.time_to_leave, color: AppColors.primary),
                    title: const Text('Leave Details', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.pushNamed(context, '/leave-details');
                    },
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    leading: const Icon(Icons.receipt_long, color: AppColors.primary),
                    title: const Text('My Expense Claims', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const ExpensesScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    leading: const Icon(Icons.feedback_outlined, color: AppColors.primary),
                    title: const Text('Anonymous Feedback', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const FeedbackScreen()),
                      );
                    },
                  ),
                  const Divider(height: 1, indent: 16, endIndent: 16),
                  ListTile(
                    leading: const Icon(Icons.security_outlined, color: AppColors.primary),
                    title: const Text('System Permissions', style: TextStyle(fontWeight: FontWeight.w600)),
                    trailing: const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (context) => const PermissionsScreen()),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24.0),
              child: CustomButton(
                text: 'Log Out',
                backgroundColor: AppColors.errorContainer,
                textColor: AppColors.onErrorContainer,
                icon: Icons.logout,
                onPressed: () => _handleLogout(context),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileTile(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.outlineVariant, width: 0.5)),
      ),
      child: Row(
        children: [
          Icon(icon, color: AppColors.outline),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(fontSize: 11, color: AppColors.outline, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.onSurface),
                ),
              ],
            ),
          )
        ],
      ),
    );
  }
}
