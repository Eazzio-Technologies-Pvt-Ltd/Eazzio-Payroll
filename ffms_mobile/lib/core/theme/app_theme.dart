import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ============================================================
// EAZZIO PAYROLL — DESIGN SYSTEM v2
// Modern Employee Management App UI
// Reference: Petpooja Payroll + 2025 Material Design trends
// ============================================================

class AppColors {
  // --- PRIMARY COLORS ---
  static const Color primary = Color(0xFF0CD693);        // Teal/Green for all buttons
  static const Color primaryLight = Color(0xFF33FFAA);   // Light Teal
  static const Color primarySoft = Color(0xFFE6FFF5);    // Soft Teal bg
  static const Color primaryDark = Color(0xFF079968);    // Dark Teal

  // --- ACCENT COLORS ---
  static const Color accent = Color(0xFF0B093E);         // Solid Navy Blue accent from logo
  static const Color accentSoft = Color(0xFFF0F1FA);     // Soft Navy Blue bg

  // --- SEMANTIC COLORS ---
  static const Color success = Color(0xFF059669);        // Green — punch in
  static const Color successSoft = Color(0xFFECFDF5);    // Soft green bg
  static const Color warning = Color(0xFFD97706);        // Amber — pending
  static const Color warningSoft = Color(0xFFFFFBEB);    // Soft amber bg
  static const Color error = Color(0xFFDC2626);          // Red — punch out
  static const Color errorSoft = Color(0xFFFEF2F2);      // Soft red bg
  static const Color info = Color(0xFF0891B2);           // Cyan — info

  // --- NEUTRAL COLORS ---
  static const Color bgPage = Color(0xFFFFFFFF);         // Page background: WHITE
  static const Color bgCard = Color(0xFFFFFFFF);         // Card background
  static const Color bgInput = Color(0xFFF8FAFC);        // Input background
  static const Color border = Color(0xFFE2E8F0);         // Border color
  static const Color divider = Color(0xFFE2E8F0);        // Divider

  // --- TEXT COLORS ---
  static const Color textPrimary = Color(0xFF0F172A);    // Almost black for legibility
  static const Color textSecondary = Color(0xFF475569);  // Slate grey
  static const Color textTertiary = Color(0xFF94A3B8);   // Light grey
  static const Color textOnPrimary = Color(0xFFFFFFFF);  // White on buttons

  // Backward compatibility mappings
  static const Color onPrimary = Colors.white;
  static const Color primaryContainer = primarySoft;
  static const Color onPrimaryContainer = primaryDark;
  
  static const Color secondary = success;
  static const Color onSecondary = Colors.white;
  static const Color secondaryContainer = successSoft;
  static const Color onSecondaryContainer = success;
  
  static const Color tertiary = accent;
  static const Color onTertiary = Colors.white;
  
  static const Color onError = Colors.white;
  static const Color errorContainer = errorSoft;
  static const Color onErrorContainer = error;
  
  static const Color background = bgPage;
  static const Color onBackground = textPrimary;
  
  static const Color surface = bgCard;
  static const Color onSurface = textPrimary;
  static const Color onSurfaceVariant = textSecondary;
  
  static const Color outline = textTertiary;
  static const Color outlineVariant = border;
}

class AppTheme {
  // --- GRADIENTS (Flat solid colors to meet no-gradient constraint) ---
  static const LinearGradient headerGradient = LinearGradient(
    colors: [Color(0xFF0B093E), Color(0xFF0B093E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient punchInGradient = LinearGradient(
    colors: [Color(0xFF0CD693), Color(0xFF0CD693)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient punchOutGradient = LinearGradient(
    colors: [Color(0xFFDC2626), Color(0xFFDC2626)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const LinearGradient salaryGradient = LinearGradient(
    colors: [Color(0xFF0B093E), Color(0xFF0B093E)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  // --- SHADOWS ---
  static List<BoxShadow> cardShadow = [
    BoxShadow(
      color: const Color(0xFF0F172A).withValues(alpha: 0.06),
      blurRadius: 16,
      offset: const Offset(0, 4),
      spreadRadius: 0,
    ),
  ];
  static List<BoxShadow> buttonShadow = [
    BoxShadow(
      color: AppColors.primary.withValues(alpha: 0.30),
      blurRadius: 12,
      offset: const Offset(0, 4),
      spreadRadius: 0,
    ),
  ];

  // --- BORDER RADIUS ---
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusXL = 20.0;
  static const double radiusXXL = 24.0;

  // --- SPACING ---
  static const double spacingXS = 4.0;
  static const double spacingSM = 8.0;
  static const double spacingMD = 16.0;
  static const double spacingLG = 24.0;
  static const double spacingXL = 32.0;

  // --- CARD DECORATION ---
  static BoxDecoration cardDecoration = BoxDecoration(
    color: AppColors.bgCard,
    borderRadius: BorderRadius.circular(radiusLarge),
    border: Border.all(color: AppColors.border, width: 1),
    boxShadow: cardShadow,
  );

  // --- GLASS CARD (for hero sections) ---
  static BoxDecoration glassDecoration = BoxDecoration(
    gradient: LinearGradient(
      colors: [
        Colors.white.withValues(alpha: 0.95),
        Colors.white.withValues(alpha: 0.80),
      ],
      begin: Alignment.topLeft,
      end: Alignment.bottomRight,
    ),
    borderRadius: BorderRadius.circular(radiusXL),
    border: Border.all(
      color: Colors.white.withValues(alpha: 0.9),
      width: 1.5,
    ),
    boxShadow: cardShadow,
  );

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: const ColorScheme(
        brightness: Brightness.light,
        primary: AppColors.primary,
        onPrimary: AppColors.onPrimary,
        primaryContainer: AppColors.primaryContainer,
        onPrimaryContainer: AppColors.onPrimaryContainer,
        secondary: AppColors.secondary,
        onSecondary: AppColors.onSecondary,
        secondaryContainer: AppColors.secondaryContainer,
        onSecondaryContainer: AppColors.onSecondaryContainer,
        tertiary: AppColors.tertiary,
        onTertiary: AppColors.onTertiary,
        error: AppColors.error,
        onError: AppColors.onError,
        errorContainer: AppColors.errorContainer,
        onErrorContainer: AppColors.onErrorContainer,
        surface: AppColors.surface,
        onSurface: AppColors.onSurface,
        outline: AppColors.outline,
        outlineVariant: AppColors.outlineVariant,
      ),
      scaffoldBackgroundColor: AppColors.background,
      textTheme: GoogleFonts.interTextTheme().copyWith(
        headlineLarge: const TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          height: 1.33,
          color: AppColors.onSurface,
        ),
        headlineMedium: const TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.bold,
          height: 1.4,
          color: AppColors.onSurface,
        ),
        headlineSmall: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          height: 1.33,
          color: AppColors.onSurface,
        ),
        bodyLarge: const TextStyle(
          fontSize: 16,
          fontWeight: FontWeight.normal,
          height: 1.5,
          color: AppColors.onSurface,
        ),
        bodyMedium: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.normal,
          height: 1.43,
          color: AppColors.onSurfaceVariant,
        ),
        labelLarge: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w600,
          height: 1.43,
          letterSpacing: 0.1,
          color: AppColors.onSurface,
        ),
        labelMedium: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          height: 1.33,
          letterSpacing: 0.2,
          color: AppColors.onSurfaceVariant,
        ),
        labelSmall: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w500,
          height: 1.27,
          color: AppColors.onSurfaceVariant,
        ),
      ),
      
      // Elevated Button Theme (52px height, radiusMedium radius)
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(52),
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.onPrimary,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          textStyle: const TextStyle(
            fontFamily: 'Inter',
            fontSize: 15,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
      
      // Text Field Theme (radiusMedium radius)
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: AppColors.bgInput,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: AppColors.border, width: 1.5),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: AppColors.border, width: 1.5),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: AppColors.primary, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(radiusMedium),
          borderSide: const BorderSide(color: AppColors.error, width: 1.5),
        ),
        labelStyle: const TextStyle(
          fontSize: 14,
          fontWeight: FontWeight.w500,
          color: AppColors.onSurfaceVariant,
        ),
        hintStyle: const TextStyle(
          fontSize: 14,
          color: AppColors.outline,
        ),
      ),
      
      // Card Theme (radiusLarge radius)
      cardTheme: CardThemeData(
        color: AppColors.surface,
        elevation: 1,
        shadowColor: Colors.black.withValues(alpha: 0.02),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radiusLarge),
          side: const BorderSide(color: AppColors.outlineVariant, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      // Sleek Web-like AppBar
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.surface,
        foregroundColor: AppColors.onSurface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: AppColors.onSurfaceVariant),
        titleTextStyle: TextStyle(
          color: AppColors.onSurface,
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: AppColors.surface,
        selectedItemColor: AppColors.primary,
        unselectedItemColor: AppColors.outline,
        elevation: 10,
        type: BottomNavigationBarType.fixed,
        showUnselectedLabels: true,
      ),
    );
  }
}
