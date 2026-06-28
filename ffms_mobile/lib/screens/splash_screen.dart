import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/auth_provider.dart';
import '../core/utils/storage_helper.dart';
import '../core/theme/app_theme.dart';
import 'permissions_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with TickerProviderStateMixin {
  late AnimationController _logoController;
  late Animation<double> _logoScale;
  late Animation<double> _logoOpacity;

  late AnimationController _glowController;
  late Animation<double> _glowBlur;
  late Animation<Color?> _glowColor;

  late AnimationController _nameController;
  late Animation<double> _nameOpacity;
  late Animation<Offset> _nameSlide;

  late AnimationController _taglineController;
  late Animation<double> _taglineFadeAnimation;

  late AnimationController _particleController;
  late Animation<double> _particleOpacity;

  @override
  void initState() {
    super.initState();

    // logo controller: 1400ms duration with multi-stage spring sequence
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1400),
      vsync: this,
    );

    // Bounce spring curve: overshoot -> bounce back -> settle
    _logoScale = TweenSequence([
      TweenSequenceItem(
        tween: Tween(begin: 0.5, end: 1.05)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 60, // 0ms to 840ms
      ),
      TweenSequenceItem(
        tween: Tween(begin: 1.05, end: 0.97)
            .chain(CurveTween(curve: Curves.easeInOut)),
        weight: 20, // 840ms to 1120ms
      ),
      TweenSequenceItem(
        tween: Tween(begin: 0.97, end: 1.00)
            .chain(CurveTween(curve: Curves.easeOut)),
        weight: 20, // 1120ms to 1400ms
      ),
    ]).animate(_logoController);

    // Fade logo opacity in over the first 600ms (Interval 0.0 to 0.43 of 1400ms)
    _logoOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _logoController,
        curve: const Interval(0.0, 0.43, curve: Curves.easeIn),
      ),
    );

    // Glow pulse controller: 800ms duration, starts after logo settles
    _glowController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Glow blur radius: 0 -> 40 -> 20 (pulse once)
    _glowBlur = TweenSequence([
      TweenSequenceItem(
        tween: Tween(begin: 0.0, end: 40.0).chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: Tween(begin: 40.0, end: 20.0).chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_glowController);

    // Glow color: fade in -> settle
    _glowColor = TweenSequence([
      TweenSequenceItem(
        tween: ColorTween(
          begin: AppColors.primary.withValues(alpha: 0.0),
          end: AppColors.primary.withValues(alpha: 0.6),
        ).chain(CurveTween(curve: Curves.easeOut)),
        weight: 50,
      ),
      TweenSequenceItem(
        tween: ColorTween(
          begin: AppColors.primary.withValues(alpha: 0.6),
          end: AppColors.primary.withValues(alpha: 0.3),
        ).chain(CurveTween(curve: Curves.easeIn)),
        weight: 50,
      ),
    ]).animate(_glowController);

    // App name controller: 500ms slide up + fade, starts after 800ms delay
    _nameController = AnimationController(
      duration: const Duration(milliseconds: 500),
      vsync: this,
    );

    _nameOpacity = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _nameController, curve: Curves.easeOut),
    );

    _nameSlide = Tween<Offset>(
      begin: const Offset(0, 0.2), // Slide up by 20% height offset
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _nameController, curve: Curves.easeOut));

    // Tagline controller: 600ms fade in, starts after 1400ms delay
    _taglineController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );

    _taglineFadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _taglineController, curve: Curves.easeOut),
    );

    // Particle background: 2000ms ease out fade-in
    _particleController = AnimationController(
      duration: const Duration(milliseconds: 2000),
      vsync: this,
    );

    _particleOpacity = Tween<double>(begin: 0.0, end: 0.15).animate(
      CurvedAnimation(parent: _particleController, curve: Curves.easeOut),
    );

    // Start execution sequences
    _logoController.forward().then((_) {
      if (mounted) {
        _glowController.forward();
      }
      
    });

    _particleController.forward();

    // App name appears after logo bounce — staggered sequence
    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) _nameController.forward();
    });

    // Tagline fades in last — completes the splash sequence
    Future.delayed(const Duration(milliseconds: 1400), () {
      if (mounted) _taglineController.forward();
    });

    _checkAuth();
  }

  @override
  void dispose() {
    _logoController.dispose();
    _glowController.dispose();
    _nameController.dispose();
    _taglineController.dispose();
    _particleController.dispose();
    super.dispose();
  }

  Future<void> _checkAuth() async {
    // 2-second delay to show the complete premium entrance sequence
    await Future.delayed(const Duration(seconds: 2));
    
    if (!mounted) return;

    final bool hasGrantedAllPermissions = StorageHelper.hasPermissionsBeenGranted();

    if (!hasGrantedAllPermissions) {
      if (!mounted) return;
      final navigator = Navigator.of(context);
      navigator.pushReplacement(
        MaterialPageRoute(
          builder: (context) => PermissionsScreen(
            onPermissionsGranted: () async {
              final innerNavigator = Navigator.of(context);
              final authProvider = Provider.of<AuthProvider>(context, listen: false);
              try {
                await authProvider.checkAuthStatus().timeout(const Duration(seconds: 5));
              } catch (e) {
                debugPrint('Auth check failed: $e');
              }
              if (authProvider.isAuthenticated) {
                innerNavigator.pushReplacementNamed('/home');
              } else {
                innerNavigator.pushReplacementNamed('/login');
              }
            },
          ),
        ),
      );
      return;
    }
    
    final navigator = Navigator.of(context);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    try {
      await authProvider.checkAuthStatus().timeout(const Duration(seconds: 5));
    } catch (e) {
      debugPrint('Auth check failed: $e');
    }
    
    if (!mounted) return;

    if (authProvider.isAuthenticated) {
      navigator.pushReplacementNamed('/home');
    } else {
      navigator.pushReplacementNamed('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Deep premium gradient background
          Container(
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  Color(0xFF0A0F2E),  // Deep navy — top
                  Color(0xFF1A237E),  // Royal blue — middle
                  Color(0xFF1565C0),  // Medium blue — bottom
                ],
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                stops: [0.0, 0.55, 1.0],
              ),
            ),
          ),

          // Subtle particle bg — opacity kept very low for elegance
          Positioned(
            top: 120,
            left: 60,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            top: 240,
            right: 80,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 8,
                height: 8,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 180,
            left: 90,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 5,
                height: 5,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            bottom: 280,
            right: 120,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 7,
                height: 7,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            top: 400,
            left: 150,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 4,
                height: 4,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),
          Positioned(
            top: 520,
            right: 50,
            child: FadeTransition(
              opacity: _particleOpacity,
              child: Container(
                width: 6,
                height: 6,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
            ),
          ),

          // Central logo, naming & loader contents
          Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo bounce + glow pulse
                AnimatedBuilder(
                  animation: Listenable.merge([_logoScale, _logoOpacity, _glowBlur, _glowColor]),
                  builder: (context, child) {
                    return Opacity(
                      opacity: _logoOpacity.value,
                      child: Transform.scale(
                        scale: _logoScale.value,
                        child: Container(
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: _glowColor.value ?? Colors.transparent,
                                blurRadius: _glowBlur.value,
                                spreadRadius: _glowBlur.value / 4,
                              ),
                            ],
                          ),
                          child: child,
                        ),
                      ),
                    );
                  },
                  child: Image.asset(
                    'assets/images/logo.png',
                    height: 100,
                    fit: BoxFit.contain,
                  ),
                ),
                const SizedBox(height: 24),

                // App Name and tagline slide-up sequence
                FadeTransition(
                  opacity: _nameOpacity,
                  child: SlideTransition(
                    position: _nameSlide,
                    child: Column(
                      children: [
                                              const SizedBox(height: 8),
                        Text(
                          'Smart Workforce Tracking',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: Colors.white70,
                            fontWeight: FontWeight.w500,
                            letterSpacing: 0.2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 48),

                // Loading spinner
                const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                  ),
                ),
              ],
            ),
          ),

          // Bottom Tagline
          Positioned(
            bottom: 32,
            left: 0,
            right: 0,
            child: FadeTransition(
              opacity: _taglineFadeAnimation,
              child: Text(
                'Made with ❤️ by the Eazzio Technology Team',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w400,
                  color: Colors.white.withOpacity(0.60),
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
