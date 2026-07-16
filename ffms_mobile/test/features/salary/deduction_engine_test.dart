// test/features/salary/deduction_engine_test.dart

import 'package:flutter_test/flutter_test.dart';
import 'package:ffms_mobile/features/salary/deduction_engine.dart';

void main() {
  const dailySalary = 1000.0;

  group('DeductionEngine Tiered Deduction Tests (Default Config)', () {
    test('1. Late 0 min (on time) -> deduction = 0', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 0,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.0);
      expect(res.deductionAmount, 0.0);
      expect(res.tier, 1);
    });

    test('2. Late 10 min (within grace of 15 min) -> deduction = 0', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 10,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.0);
      expect(res.deductionAmount, 0.0);
      expect(res.tier, 1);
    });

    test('3. Late 15 min (exactly at grace boundary) -> deduction = 0', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 15,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.0);
      expect(res.deductionAmount, 0.0);
      expect(res.tier, 1);
    });

    test('4. Late 16 min (Tier 2) -> deduction = 0.5 days', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 16,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.5);
      expect(res.deductionAmount, 500.0);
      expect(res.tier, 2);
    });

    test('5. Late 30 min (Tier 2 boundary) -> deduction = 0.5 days', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 30,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.5);
      expect(res.deductionAmount, 500.0);
      expect(res.tier, 2);
    });

    test('6. Late 31 min (Tier 3) -> deduction = 1.0 day', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 31,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.0);
      expect(res.deductionAmount, 1000.0);
      expect(res.tier, 3);
    });

    test('7. Late 60 min (Tier 3 boundary) -> deduction = 1.0 day', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 60,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.0);
      expect(res.deductionAmount, 1000.0);
      expect(res.tier, 3);
    });

    test('8. Late 65 min (Tier 4) -> deduction = 1.5 days', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 65,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.5);
      expect(res.deductionAmount, 1500.0);
      expect(res.tier, 4);
    });

    test('9. Custom config (grace=5, halfDay=10, fullDay=20) -> verify thresholds apply correctly', () {
      const customConfig = DeductionConfig(
        gracePeriodMinutes: 5,
        halfDayThresholdMinutes: 10,
        fullDayThresholdMinutes: 20,
      );

      // Late 4 min -> Tier 1 (0.0 days)
      final resGrace = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 4,
          dailySalary: dailySalary,
        ),
        config: customConfig,
      );
      expect(resGrace.deductionDays, 0.0);

      // Late 8 min -> Tier 2 (0.5 days)
      final resHalf = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 8,
          dailySalary: dailySalary,
        ),
        config: customConfig,
      );
      expect(resHalf.deductionDays, 0.5);

      // Late 15 min -> Tier 3 (1.0 day)
      final resFull = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 15,
          dailySalary: dailySalary,
        ),
        config: customConfig,
      );
      expect(resFull.deductionDays, 1.0);

      // Late 25 min -> Tier 4 (1.5 days)
      final resMax = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.latePunchIn,
          lateMinutes: 25,
          dailySalary: dailySalary,
        ),
        config: customConfig,
      );
      expect(resMax.deductionDays, 1.5);
    });

    test('10. Absent-day handling (no approved leave) -> 1.0 day deduction', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.absent,
          hasApprovedLeave: false,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.0);
      expect(res.deductionAmount, 1000.0);
      expect(res.penaltyApplied, isFalse);
    });

    test('11. Absent-day handling (with approved leave) -> 0 deduction', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.absent,
          hasApprovedLeave: true,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 0.0);
      expect(res.deductionAmount, 0.0);
    });

    test('12. Consecutive-absence penalty (2 days) -> no penalty, base 1.0 day deduction', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.absent,
          hasApprovedLeave: false,
          consecutiveAbsenceDays: 2,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.0);
      expect(res.deductionAmount, 1000.0);
      expect(res.penaltyApplied, isFalse);
    });

    test('13. Consecutive-absence penalty (3 days) -> 10% penalty applied (+0.1 days)', () {
      final res = DeductionEngine.calculate(
        input: const DeductionInput(
          eventType: AttendanceEventType.absent,
          hasApprovedLeave: false,
          consecutiveAbsenceDays: 3,
          dailySalary: dailySalary,
        ),
      );
      expect(res.deductionDays, 1.0);
      expect(res.deductionAmount, 1000.0);
      expect(res.penaltyApplied, isTrue);
      expect(res.penaltyDays, 0.1);
      expect(res.penaltyAmount, 100.0);
      expect(res.totalDeductionAmount, 1100.0);
    });
  });
}
