import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../core/theme/app_theme.dart';
import '../core/utils/responsive.dart';

class RoleSelectionScreen extends StatefulWidget {
  const RoleSelectionScreen({super.key});

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      duration: const Duration(milliseconds: 600),
      vsync: this,
    );
    _fadeAnim = CurvedAnimation(parent: _animController, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.08),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _animController, curve: Curves.easeOutCubic));
    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final r = Responsive(context);

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FC),
      body: Center(
        child: Container(
          constraints: BoxConstraints(maxWidth: r.maxContentWidth),
          child: SafeArea(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              padding: EdgeInsets.symmetric(
                horizontal: r.screenPadding,
                vertical: r.spaceLG,
              ),
              child: FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      SizedBox(height: r.spaceXL),

                      // Logo
                      SizedBox(
                        width: r.width * 0.65,
                        child: Image.asset(
                          'assets/images/logo.png',
                          fit: BoxFit.contain,
                        ),
                      ),
                      SizedBox(height: r.spaceXL),

                      // Header
                      Text(
                        'Welcome Back 👋',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: r.fontXXL,
                          fontWeight: FontWeight.w800,
                          color: AppColors.textPrimary,
                          letterSpacing: -0.5,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Select your account type to continue',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: r.fontMD,
                          color: AppColors.textSecondary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: r.spaceXL),

                      // Field & Office Staff Card
                      _RoleCard(
                        title: 'Field & Office Staff',
                        welcomeTag: 'Employee Portal',
                        subtitle: 'Punch in/out, track your routes/tasks, and view your payslips.',
                        icon: Icons.directions_walk_rounded,
                        accentColor: const Color(0xFF2563EB),
                        bgColor: const Color(0xFFEFF6FF),
                        role: 'FIELD_STAFF',
                        r: r,
                      ),
                      SizedBox(height: r.spaceMD),

                      // Manager Card
                      _RoleCard(
                        title: 'Manager',
                        welcomeTag: 'Manager Portal',
                        subtitle: 'Monitor your team, approve requests, and manage attendance.',
                        icon: Icons.groups_rounded,
                        accentColor: const Color(0xFF7C3AED),
                        bgColor: const Color(0xFFF5F3FF),
                        role: 'MANAGER',
                        r: r,
                      ),
                      SizedBox(height: r.spaceMD),

                      SizedBox(height: r.spaceXL),

                      // Footer
                      Text(
                        'v1.0.1 · Eazzio Technologies',
                        style: GoogleFonts.inter(
                          fontSize: r.fontSM,
                          color: AppColors.textTertiary,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: r.spaceMD),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _RoleCard extends StatefulWidget {
  final String title;
  final String welcomeTag;
  final String subtitle;
  final IconData icon;
  final Color accentColor;
  final Color bgColor;
  final String role;
  final Responsive r;

  const _RoleCard({
    required this.title,
    required this.welcomeTag,
    required this.subtitle,
    required this.icon,
    required this.accentColor,
    required this.bgColor,
    required this.role,
    required this.r,
  });

  @override
  State<_RoleCard> createState() => _RoleCardState();
}

class _RoleCardState extends State<_RoleCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => setState(() => _pressed = true),
      onTapUp: (_) {
        setState(() => _pressed = false);
        Navigator.pushNamed(context, '/login', arguments: widget.role);
      },
      onTapCancel: () => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.97 : 1.0,
        duration: const Duration(milliseconds: 120),
        curve: Curves.easeOut,
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(AppTheme.radiusLarge),
            border: Border.all(
              color: _pressed
                  ? widget.accentColor.withValues(alpha: 0.5)
                  : AppColors.border,
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: widget.accentColor.withValues(alpha: _pressed ? 0.12 : 0.06),
                blurRadius: _pressed ? 24 : 16,
                spreadRadius: 0,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Row(
            children: [
              // Icon bubble
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: widget.bgColor,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(
                  widget.icon,
                  color: widget.accentColor,
                  size: 26,
                ),
              ),
              const SizedBox(width: 16),

              // Text
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      runSpacing: 4,
                      children: [
                        Text(
                          widget.title,
                          style: GoogleFonts.inter(
                            fontSize: widget.r.fontLG,
                            fontWeight: FontWeight.w700,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: widget.bgColor,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            widget.welcomeTag,
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w600,
                              color: widget.accentColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 5),
                    Text(
                      widget.subtitle,
                      style: GoogleFonts.inter(
                        fontSize: widget.r.fontSM,
                        color: AppColors.textSecondary,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),

              // Arrow
              Icon(
                Icons.arrow_forward_ios_rounded,
                size: 14,
                color: AppColors.textTertiary,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
