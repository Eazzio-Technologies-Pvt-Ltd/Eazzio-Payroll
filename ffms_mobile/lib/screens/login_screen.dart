import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/responsive.dart'; // Responsive helper — no hardcoded sizes
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../widgets/app_toast.dart';
import '../widgets/custom_button.dart';
import '../widgets/custom_text_field.dart';

// Login screen v2 — gradient bg + slide-up card
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> with SingleTickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading = false;
  bool _obscurePassword = true;

  late AnimationController _animationController;
  late Animation<Offset> _slideAnimation;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _initializeApi();

    _animationController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeOutQuad,
    ));
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeIn,
    ));
    _animationController.forward();
  }

  Future<void> _initializeApi() async {
    await ApiService.initialize();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await authProvider.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    setState(() => _isLoading = false);

    if (success) {
      final user = authProvider.currentUser;
      final String selectedRole = (ModalRoute.of(context)?.settings.arguments as String?) ?? 'FIELD_STAFF';
      
      bool isAllowed = false;
      if (selectedRole == 'FIELD_STAFF') {
        isAllowed = user != null && (user.role == 'FIELD_STAFF' || user.role == 'OFFICE_STAFF' || user.role == 'EMPLOYEE');
      } else {
        isAllowed = user != null && user.role == selectedRole;
      }

      if (user != null && !isAllowed) {
        authProvider.logout();
        if (mounted) {
          String expectedPortal = 'Employee';
          if (user.role == 'MANAGER') expectedPortal = 'Manager';
          if (user.role == 'ADMIN') expectedPortal = 'Employer';
          
          String selectedPortal = 'Employee';
          if (selectedRole == 'MANAGER') selectedPortal = 'Manager';
          if (selectedRole == 'ADMIN') selectedPortal = 'Employer';

          AppToast.showError(
            context, 
            'Access Denied: This account is registered for $expectedPortal Portal. You cannot login via $selectedPortal Portal.'
          );
        }
        return;
      }

      if (mounted) {
        AppToast.showSuccess(context, 'Login successful!');
        Navigator.pushNamedAndRemoveUntil(context, '/home', (route) => false);
      }
    } else {
      if (mounted) {
        AppToast.showError(context, authProvider.errorMessage ?? 'Login failed');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Uses Responsive helper — no hardcoded sizes
    final r = Responsive(context);
    final screenSize = MediaQuery.of(context).size;
    final String selectedRole = (ModalRoute.of(context)?.settings.arguments as String?) ?? 'FIELD_STAFF';

    // Role-specific theming
    final _RoleTheme theme = _getRoleTheme(selectedRole);
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: r.maxContentWidth),
          child: Stack(
            children: [
              // Scrollable Content
              SafeArea(
                child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Container(
                constraints: BoxConstraints(
                  minHeight: screenSize.height
                      - MediaQuery.of(context).padding.top
                      - MediaQuery.of(context).padding.bottom,
                ),
                padding: EdgeInsets.only(
                  left: r.screenPadding,
                  right: r.screenPadding,
                  top: r.spaceXL,
                  bottom: r.spaceMD,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top Section: Logo and Title
                    Column(
                      children: [
                        SizedBox(height: r.spaceLG),
                        // ── Back button + Logo ──────────────────────────────
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () => Navigator.of(context).pop(),
                              child: Container(
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: theme.bgColor,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: theme.accentColor.withValues(alpha: 0.2),
                                  ),
                                ),
                                child: Icon(
                                  Icons.arrow_back_ios_new_rounded,
                                  size: 16,
                                  color: theme.accentColor,
                                ),
                              ),
                            ),
                            const Spacer(),
                            SizedBox(
                              width: r.width * 0.58,
                              child: Image.asset(
                                'assets/images/logo.png',
                                fit: BoxFit.contain,
                              ),
                            ),
                            const Spacer(),
                            // Spacer mirror for centering logo
                            const SizedBox(width: 40),
                          ],
                        ),

                         SizedBox(height: screenSize.height * 0.06),
                      ],
                    ),
                    
                    // Middle Section: Form Card with slide-up animation and 3D black glow effect
                    SlideTransition(
                      position: _slideAnimation,
                      child: FadeTransition(
                        opacity: _fadeAnimation,
                        child: Container(
                          // Responsive card padding — no hardcoded values
                          padding: EdgeInsets.symmetric(
                            horizontal: r.cardPadding,
                            vertical: r.spaceXL,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(AppTheme.radiusXXL),
                            border: Border.all(
                              color: AppColors.border,
                              width: 1,
                            ),
                            boxShadow: [
                              // Deeper ambient glow
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.12),
                                blurRadius: 30,
                                spreadRadius: 6,
                                offset: const Offset(0, 15),
                              ),
                              // Sharp close 3D shadow
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.08),
                                blurRadius: 10,
                                spreadRadius: 0,
                                offset: const Offset(0, 5),
                              ),
                            ],
                          ),
                           child: Form(
                            key: _formKey,
                            child: Column(
                               crossAxisAlignment: CrossAxisAlignment.start,
                               children: [
                                 // Role badge
                                 Container(
                                   padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                                   decoration: BoxDecoration(
                                     color: theme.bgColor,
                                     borderRadius: BorderRadius.circular(20),
                                   ),
                                   child: Row(
                                     mainAxisSize: MainAxisSize.min,
                                     children: [
                                       Icon(theme.icon, size: 13, color: theme.accentColor),
                                       const SizedBox(width: 5),
                                       Text(
                                         theme.portalTag,
                                         style: GoogleFonts.inter(
                                           fontSize: 11,
                                           fontWeight: FontWeight.w600,
                                           color: theme.accentColor,
                                         ),
                                       ),
                                     ],
                                   ),
                                 ),
                                 SizedBox(height: r.spaceSM),
                                 Text(
                                   theme.welcomeTitle,
                                   style: GoogleFonts.inter(
                                     color: AppColors.textPrimary,
                                     fontSize: r.fontXL,
                                     fontWeight: FontWeight.w700,
                                   ),
                                 ),
                                 SizedBox(height: r.spaceXS),
                                 Text(
                                   theme.welcomeSubtitle,
                                   style: GoogleFonts.inter(
                                     color: AppColors.textSecondary,
                                     fontSize: r.fontMD,
                                   ),
                                 ),
                                SizedBox(height: r.spaceLG),
                                CustomTextField(
                                  controller: _emailController,
                                  label: 'Email Address',
                                  hint: 'name@company.com',
                                  prefixIcon: Icons.mail_outline_rounded,
                                  keyboardType: TextInputType.emailAddress,
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter your email';
                                    }
                                    if (!value.contains('@')) {
                                      return 'Enter a valid email address';
                                    }
                                    return null;
                                  },
                                ),
                                SizedBox(height: r.spaceMD),
                                CustomTextField(
                                  controller: _passwordController,
                                  label: 'Password',
                                  hint: '••••••••',
                                  prefixIcon: Icons.lock_outline_rounded,
                                  obscureText: _obscurePassword,
                                  suffixIcon: IconButton(
                                    icon: Icon(
                                      _obscurePassword
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      color: AppColors.textTertiary,
                                      size: r.iconSizeMD,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _obscurePassword = !_obscurePassword;
                                      });
                                    },
                                  ),
                                  validator: (value) {
                                    if (value == null || value.isEmpty) {
                                      return 'Please enter your password';
                                    }
                                    if (value.length < 6) {
                                      return 'Password must be at least 6 characters';
                                    }
                                    return null;
                                  },
                                ),
                                SizedBox(height: r.spaceXL),
                                CustomButton(
                                  text: 'Sign In',
                                  isLoading: _isLoading,
                                  onPressed: _handleLogin,
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ),
                    
                    // Bottom Section: Footer Version
                    Column(
                      children: [
                        SizedBox(height: r.spaceXL),
                        Text(
                          'v1.0.1 · Eazzio Technologies',
                          style: GoogleFonts.inter(
                            fontSize: r.fontSM, // responsive font size
                            color: AppColors.textTertiary,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        SizedBox(height: r.spaceMD),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _animationController.dispose();
    super.dispose();
  }
}

// ── Role-specific theming data ────────────────────────────────────────────────
class _RoleTheme {
  final String portalTag;
  final String welcomeTitle;
  final String welcomeSubtitle;
  final Color accentColor;
  final Color bgColor;
  final IconData icon;

  const _RoleTheme({
    required this.portalTag,
    required this.welcomeTitle,
    required this.welcomeSubtitle,
    required this.accentColor,
    required this.bgColor,
    required this.icon,
  });
}

_RoleTheme _getRoleTheme(String role) {
  switch (role) {
    case 'MANAGER':
      return const _RoleTheme(
        portalTag: 'Manager Portal',
        welcomeTitle: 'Welcome, Manager! 👥',
        welcomeSubtitle: 'Sign in to manage your team and approvals',
        accentColor: Color(0xFF7C3AED),
        bgColor: Color(0xFFF5F3FF),
        icon: Icons.groups_rounded,
      );
    case 'ADMIN':
      return const _RoleTheme(
        portalTag: 'Office Staff Portal',
        welcomeTitle: 'Welcome, Office Staff! 🏢',
        welcomeSubtitle: 'Sign in to access HR, payroll & admin tools',
        accentColor: Color(0xFF059669),
        bgColor: Color(0xFFECFDF5),
        icon: Icons.business_center_rounded,
      );
    default: // FIELD_STAFF
      return const _RoleTheme(
        portalTag: 'Field & Office Staff Portal',
        welcomeTitle: 'Welcome Back! 👋',
        welcomeSubtitle: 'Sign in to track your day and tasks',
        accentColor: Color(0xFF2563EB),
        bgColor: Color(0xFFEFF6FF),
        icon: Icons.directions_walk_rounded,
      );
  }
}