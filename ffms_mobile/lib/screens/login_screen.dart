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
      if (mounted) {
        AppToast.showSuccess(context, 'Login successful!');
        Navigator.pushReplacementNamed(context, '/home');
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
    return Scaffold(
      backgroundColor: AppColors.bgPage,
      body: Stack(
        children: [
          // Top 40% Gradient Background
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            height: screenSize.height * 0.40,
            child: Container(
              decoration: const BoxDecoration(
                gradient: AppTheme.headerGradient,
                borderRadius: BorderRadius.only(
                  bottomLeft: Radius.circular(32),
                  bottomRight: Radius.circular(32),
                ),
              ),
            ),
          ),
          
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
                padding: EdgeInsets.symmetric(
                  // Responsive horizontal padding — scales on all screen widths
                  horizontal: r.screenPadding,
                  vertical: r.spaceMD,
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Top Section: Logo and Title
                    Column(
                      children: [
                        SizedBox(height: r.spaceLG),

                        // ── Logo container ──────────────────────────────────
                         // Render the horizontal brand logo directly on the dark background
                         // Uses 65% of screen width to ensure perfect readability
                         SizedBox(
                           width: r.width * 0.65,
                           child: Image.asset(
                             'assets/images/logo.png',
                             fit: BoxFit.contain,
                           ),
                         ),

                         SizedBox(height: screenSize.height * 0.024),

                        // Subtitle — responsive font size
                        Text(
                          'Enter your credentials to access your account',
                          textAlign: TextAlign.center,
                          style: GoogleFonts.inter(
                            fontSize: r.fontMD, // ~14px, responsive
                            color: Colors.white.withOpacity(0.85),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                        SizedBox(height: r.spaceXL),
                      ],
                    ),
                    
                    // Middle Section: Form Card with slide-up animation
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
                            boxShadow: AppTheme.cardShadow,
                          ),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Welcome Back 👋',
                                  style: GoogleFonts.inter(
                                    color: AppColors.textPrimary,
                                    fontSize: r.fontXL, // responsive font size
                                    fontWeight: FontWeight.w700,
                                  ),
                                ),
                                SizedBox(height: r.spaceXS),
                                Text(
                                  'Sign in to continue',
                                  style: GoogleFonts.inter(
                                    color: AppColors.textSecondary,
                                    fontSize: r.fontMD, // responsive font size
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