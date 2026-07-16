// lib/features/salary/deduction_engine.dart
//
// TASK-006 — Progressive Deduction Engine
// Business Rules (from requirements document):
//
//   Tier 1  (Late ≤ 15 min  or Early Leave ≤ 15 min)  → No Deduction
//   Tier 2  (Late 16–30 min or Early Leave 16–30 min)  → 0.5 day deduction
//   Tier 3  (Late 31–60 min or Early Leave 31–60 min)  → 1.0 day deduction
//   Tier 4  (Late > 60 min  or Early Leave  > 60 min)  → 1.5 day deduction
//
//   Absent without approved leave                       → Full day deduction
//   Consecutive absences (≥ 3 days)                    → Additional 10% penalty
//
// The engine is PURE (no side-effects). Call DeductionEngine.calculate()
// and consume the returned [DeductionResult].

import 'package:flutter/foundation.dart';

// ─────────────────────────── Configuration ───────────────────────────────────

/// Business-tunable thresholds.  Change only here — never in the formula.
class DeductionConfig {
  const DeductionConfig({
    this.gracePeriodMinutes = 15,
    this.halfDayThresholdMinutes = 30,
    this.fullDayThresholdMinutes = 60,
    this.consecutiveAbsencePenaltyDays = 3,
    this.consecutiveAbsencePenaltyFactor = 0.10, // 10 %
  });

  /// ≤ this → Tier 1 (no deduction)
  final int gracePeriodMinutes;

  /// > gracePeriod and ≤ this → Tier 2 (0.5 day)
  final int halfDayThresholdMinutes;

  /// > halfDay and ≤ this → Tier 3 (1.0 day)
  final int fullDayThresholdMinutes;

  /// If consecutive absences reach this count, apply extra penalty
  final int consecutiveAbsencePenaltyDays;

  /// Extra deduction factor on top of 1.0 when consecutive-absence rule fires
  final double consecutiveAbsencePenaltyFactor;

  static const DeductionConfig standard = DeductionConfig();
}

// ─────────────────────────── Input & Output ──────────────────────────────────

enum AttendanceEventType {
  /// Employee did not mark attendance at all
  absent,

  /// Employee arrived late (lateMinutes > 0)
  latePunchIn,

  /// Employee left before shift end (earlyLeaveMinutes > 0)
  earlyPunchOut,

  /// Combination of late arrival + early departure
  lateAndEarlyLeave,

  /// Full, compliant attendance
  present,
}

class DeductionInput {
  const DeductionInput({
    required this.eventType,
    this.lateMinutes = 0,
    this.earlyLeaveMinutes = 0,
    this.hasApprovedLeave = false,
    this.consecutiveAbsenceDays = 0,
    this.dailySalary = 0.0,
  });

  final AttendanceEventType eventType;

  /// Minutes the employee punched in AFTER the official shift start
  final int lateMinutes;

  /// Minutes the employee punched out BEFORE the official shift end
  final int earlyLeaveMinutes;

  /// If true, Absent events produce zero deduction (leave is pre-approved)
  final bool hasApprovedLeave;

  /// How many calendar days in a row the employee has been absent.
  /// Used to trigger the consecutive-absence penalty.
  final int consecutiveAbsenceDays;

  /// Daily gross salary in the employee's currency.  Used to compute amounts.
  final double dailySalary;
}

class DeductionResult {
  const DeductionResult({
    required this.deductionDays,
    required this.deductionAmount,
    required this.tier,
    required this.reason,
    this.penaltyApplied = false,
    this.penaltyDays = 0.0,
    this.penaltyAmount = 0.0,
  });

  /// Base deduction in "days" units  (0.0, 0.5, 1.0, 1.5)
  final double deductionDays;

  /// Monetary deduction  = deductionDays × dailySalary  (+ penalty if any)
  final double deductionAmount;

  /// 1, 2, 3, or 4 — useful for logging / UI display
  final int tier;

  /// Human-readable explanation
  final String reason;

  /// Whether the consecutive-absence penalty was added
  final bool penaltyApplied;

  /// Additional days deducted as penalty
  final double penaltyDays;

  /// Additional monetary penalty
  final double penaltyAmount;

  /// Convenience: total amount deducted (base + penalty)
  double get totalDeductionAmount => deductionAmount + penaltyAmount;

  @override
  String toString() =>
      'DeductionResult(tier=$tier, days=$deductionDays, amount=$deductionAmount, '
      'penalty=$penaltyApplied, total=$totalDeductionAmount, reason="$reason")';
}

// ─────────────────────────── Engine ──────────────────────────────────────────

class DeductionEngine {
  const DeductionEngine._(); // static-only class

  /// Main calculation entry point.
  ///
  /// ```dart
  /// final result = DeductionEngine.calculate(
  ///   input: DeductionInput(
  ///     eventType: AttendanceEventType.latePunchIn,
  ///     lateMinutes: 22,
  ///     dailySalary: 1200.0,
  ///   ),
  /// );
  /// print(result.totalDeductionAmount); // 600.0
  /// ```
  static DeductionResult calculate({
    required DeductionInput input,
    DeductionConfig config = DeductionConfig.standard,
  }) {
    // Approved leave → always zero deduction regardless of event type
    if (input.hasApprovedLeave) {
      return const DeductionResult(
        deductionDays: 0.0,
        deductionAmount: 0.0,
        tier: 1,
        reason: 'Approved leave — no deduction applied.',
      );
    }

    switch (input.eventType) {
      case AttendanceEventType.present:
        return const DeductionResult(
          deductionDays: 0.0,
          deductionAmount: 0.0,
          tier: 1,
          reason: 'Full attendance — no deduction.',
        );

      case AttendanceEventType.absent:
        return _applyAbsent(input, config);

      case AttendanceEventType.latePunchIn:
        return _applyTiered(
          minutes: input.lateMinutes,
          label: 'Late by ${input.lateMinutes} min',
          dailySalary: input.dailySalary,
          config: config,
        );

      case AttendanceEventType.earlyPunchOut:
        return _applyTiered(
          minutes: input.earlyLeaveMinutes,
          label: 'Left early by ${input.earlyLeaveMinutes} min',
          dailySalary: input.dailySalary,
          config: config,
        );

      case AttendanceEventType.lateAndEarlyLeave:
        // Take the worst (larger) of the two violations for the base tier,
        // but cap at Tier 4 (1.5 days).
        final worst = input.lateMinutes > input.earlyLeaveMinutes
            ? input.lateMinutes
            : input.earlyLeaveMinutes;
        return _applyTiered(
          minutes: worst,
          label: 'Late ${input.lateMinutes} min & early leave ${input.earlyLeaveMinutes} min',
          dailySalary: input.dailySalary,
          config: config,
        );
    }
  }

  // ─── Absent handler ───────────────────────────────────────────────────────

  static DeductionResult _applyAbsent(
    DeductionInput input,
    DeductionConfig config,
  ) {
    const baseDays = 1.0;
    final baseAmount = baseDays * input.dailySalary;

    // Check for consecutive-absence penalty
    if (input.consecutiveAbsenceDays >= config.consecutiveAbsencePenaltyDays) {
      final penaltyDays = config.consecutiveAbsencePenaltyFactor;
      final penaltyAmount = penaltyDays * input.dailySalary;
      debugPrint(
        '[DeductionEngine] Consecutive absence penalty triggered '
        '(${input.consecutiveAbsenceDays} days ≥ ${config.consecutiveAbsencePenaltyDays})',
      );
      return DeductionResult(
        deductionDays: baseDays,
        deductionAmount: baseAmount,
        tier: 4,
        reason:
            'Absent (${input.consecutiveAbsenceDays} consecutive days) — '
            'full day + ${(penaltyDays * 100).toStringAsFixed(0)}% penalty.',
        penaltyApplied: true,
        penaltyDays: penaltyDays,
        penaltyAmount: penaltyAmount,
      );
    }

    return DeductionResult(
      deductionDays: baseDays,
      deductionAmount: baseAmount,
      tier: 4,
      reason: 'Absent — full day deduction.',
    );
  }

  // ─── Tiered late / early-leave handler ────────────────────────────────────

  static DeductionResult _applyTiered({
    required int minutes,
    required String label,
    required double dailySalary,
    required DeductionConfig config,
  }) {
    if (minutes <= config.gracePeriodMinutes) {
      // Tier 1 — within grace period
      return DeductionResult(
        deductionDays: 0.0,
        deductionAmount: 0.0,
        tier: 1,
        reason: '$label — within grace period (≤${config.gracePeriodMinutes} min), no deduction.',
      );
    }

    if (minutes <= config.halfDayThresholdMinutes) {
      // Tier 2 — 0.5 day
      const days = 0.5;
      return DeductionResult(
        deductionDays: days,
        deductionAmount: days * dailySalary,
        tier: 2,
        reason: '$label — Tier 2 (16–${config.halfDayThresholdMinutes} min): 0.5 day deducted.',
      );
    }

    if (minutes <= config.fullDayThresholdMinutes) {
      // Tier 3 — 1.0 day
      const days = 1.0;
      return DeductionResult(
        deductionDays: days,
        deductionAmount: days * dailySalary,
        tier: 3,
        reason:
            '$label — Tier 3 (${config.halfDayThresholdMinutes + 1}–${config.fullDayThresholdMinutes} min): 1.0 day deducted.',
      );
    }

    // Tier 4 — > 60 min → 1.5 day
    const days = 1.5;
    return DeductionResult(
      deductionDays: days,
      deductionAmount: days * dailySalary,
      tier: 4,
      reason: '$label — Tier 4 (>${config.fullDayThresholdMinutes} min): 1.5 day deducted.',
    );
  }
}
