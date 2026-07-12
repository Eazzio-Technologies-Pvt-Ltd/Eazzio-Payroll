const prisma = require('../config/prisma');
const { getISTDateBoundaries, getWorkingDaysInMonth } = require('../utils/salaryUtils');

/**
 * Helper to get the current date components in IST (Asia/Kolkata).
 * Useful to avoid server-timezone discrepancies.
 * 
 * @returns {{ year: number, month: number, day: number }}
 */
const getISTCurrentDateComponents = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find(p => p.type === 'year').value, 10);
  const month = parseInt(parts.find(p => p.type === 'month').value, 10); // 1-based
  const day = parseInt(parts.find(p => p.type === 'day').value, 10);
  return { year, month, day };
};

/**
 * Counts working days (excluding Sundays only) from day 1 up to upToDay of the given month.
 *
 * @param {number} year   Full year, e.g. 2026
 * @param {number} month  1-based month, e.g. 7 for July
 * @param {number} upToDay Day of the month, e.g. 9
 * @returns {number}
 */
const getElapsedWorkingDays = (year, month, upToDay) => {
  const mStr = String(month).padStart(2, '0');
  let count = 0;
  for (let day = 1; day <= upToDay; day++) {
    const dStr = String(day).padStart(2, '0');
    const d = new Date(`${year}-${mStr}-${dStr}T00:00:00+05:30`);
    if (d.getDay() !== 0) { // 0 = Sunday
      count++;
    }
  }
  return count;
};

/**
 * Fetch and calculate salary list for a month.
 * Formula:
 *   WorkingDays = TotalDaysInMonth - SundaysInMonth
 *   GrossSalary = (BaseSalary / WorkingDays) * DaysPresent + Bonus
 *   Deductions = (BaseSalary / WorkingDays) * amountDays (from PayrollDeduction)
 *   Advances = total approved advance amount (from Advance)
 *   NetSalary = GrossSalary - Deductions - Advances
 * 
 * @param {string} organizationId 
 * @param {string|null} monthStr  Format: "YYYY-MM"
 * @returns {Promise<Object>}
 */
const getSalaryList = async (organizationId, monthStr) => {
  // Determine IST-safe date boundaries
  // Using explicit +05:30 offset so Prisma @db.Date comparisons work correctly
  // regardless of the server's system timezone (UTC on most deployments).
  let startDate, endDate, year, m;

  if (monthStr) {
    const parts = monthStr.split('-');
    year = parseInt(parts[0], 10);
    m    = parseInt(parts[1], 10);
    ({ startDate, endDate } = getISTDateBoundaries(monthStr));
  } else {
    const now = new Date();
    year = now.getFullYear();
    m    = now.getMonth() + 1; // 1-based
    const mStr = String(m).padStart(2, '0');
    ({ startDate, endDate } = getISTDateBoundaries(`${year}-${mStr}`));
  }

  const endDateBoundary = endDate; // alias — endDate already includes 23:59:59.999 IST

  // Working days for this month (Mon-Sat, Sunday excluded)
  const totalWorkingDays = getWorkingDaysInMonth(year, m);

  // Fetch all active users in the organization
  const users = await prisma.user.findMany({
    where: {
      organizationId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      baseSalary: true,
      bonus: true,
      employeeId: true,
    },
  });

  const userIds = users.map(u => u.id);

  // Fetch attendances for the month
  const attendances = await prisma.attendance.findMany({
    where: {
      userId: { in: userIds },
      date: {
        gte: startDate,
        lte: endDateBoundary,
      },
      status: {
        in: ['PRESENT', 'LATE', 'HALF_DAY'],
      },
    },
    select: {
      userId: true,
      status: true,
    },
  });

  // Fetch approved leaves for the month
  const leaves = await prisma.leave.findMany({
    where: {
      userId: { in: userIds },
      status: 'APPROVED',
      startDate: { lte: endDateBoundary },
      endDate: { gte: startDate },
    },
    select: {
      userId: true,
      totalDays: true,
      startDate: true,
      endDate: true,
    },
  });

  // Fetch payroll deductions for the month
  const deductions = await prisma.payrollDeduction.findMany({
    where: {
      userId: { in: userIds },
      dateApplied: {
        gte: startDate,
        lte: endDateBoundary,
      },
    },
    select: {
      userId: true,
      amountDays: true,
      reason: true,
    },
  });

  // Fetch approved advances for the month
  const advances = await prisma.advance.findMany({
    where: {
      userId: { in: userIds },
      status: 'APPROVED',
      dateApproved: {
        gte: startDate,
        lte: endDateBoundary,
      },
    },
    select: {
      userId: true,
      amount: true,
    },
  });

  const { year: currentYear, month: currentMonth, day: currentDay } = getISTCurrentDateComponents();
  const isCurrentMonth = (year === currentYear && m === currentMonth);

  const userStats = users.map(user => {
    // 1. Calculate days present
    const userAttendances = attendances.filter(a => a.userId === user.id);
    let daysPresent = 0;
    userAttendances.forEach(a => {
      if (a.status === 'PRESENT' || a.status === 'LATE') daysPresent += 1;
      if (a.status === 'HALF_DAY') daysPresent += 0.5;
    });

    // Cap daysPresent at totalWorkingDays to prevent overtime/Sunday-work inflation
    // unless policy allows it. Capping is standard for fixed monthly salary.
    const cappedDaysPresent = Math.min(daysPresent, totalWorkingDays);

    // 2. Calculate leaves within the month
    const userLeaves = leaves.filter(l => l.userId === user.id);
    let totalLeaves = 0;
    userLeaves.forEach(l => {
      const leaveStart = l.startDate < startDate ? startDate : l.startDate;
      const leaveEnd = l.endDate > endDateBoundary ? endDateBoundary : l.endDate;
      if (leaveStart <= leaveEnd) {
        const diffTime = Math.abs(leaveEnd - leaveStart);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        totalLeaves += diffDays;
      }
    });

    // 3. Compute base & per-day salary
    const baseSalary = user.baseSalary || 0;
    const bonus = user.bonus || 0;
    const perDaySalary = totalWorkingDays > 0 ? (baseSalary / totalWorkingDays) : (baseSalary / 26.0);

    // 4. Calculate gross salary (Do NOT change grossSalary calculation - remains prorated against full month working days)
    let grossSalary = 0;
    if (baseSalary > 0) {
      grossSalary = (cappedDaysPresent * perDaySalary) + bonus;
    }

    // Calculate daysAbsent and unpaidLeaveDeduction
    const denominator = isCurrentMonth ? getElapsedWorkingDays(year, m, currentDay) : totalWorkingDays;
    const daysAbsent = Math.max(0, denominator - cappedDaysPresent);
    const unpaidLeaveDeduction = daysAbsent * perDaySalary;

    // 5. Calculate deductions (e.g. late arrival streak penalty)
    const userDeductions = deductions.filter(d => d.userId === user.id);
    const totalDeductionDays = userDeductions.reduce((sum, d) => sum + (d.amountDays || 0), 0);
    const deductionsAmount = totalDeductionDays * perDaySalary;

    // 6. Calculate approved advances
    const userAdvances = advances.filter(ad => ad.userId === user.id);
    const totalAdvancesAmount = userAdvances.reduce((sum, ad) => sum + (ad.amount || 0), 0);

    // 7. Calculate net salary (matches gatherPayslipData: base - absence deduction + bonus - advances)
    let netSalary = baseSalary > 0 ? (baseSalary - unpaidLeaveDeduction + bonus - totalAdvancesAmount) : 0;
    netSalary = Math.max(0, netSalary); // Net salary cannot be negative

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeId: user.employeeId,
      baseSalary: Math.round(baseSalary * 100) / 100,
      bonus: Math.round(bonus * 100) / 100,
      workingDays: totalWorkingDays, // Restored to original meaning: total working days in the month
      daysPresent,
      totalWorkingDays,
      totalLeaves,
      totalDeductionDays,
      deductionsAmount: Math.round(deductionsAmount * 100) / 100,
      totalAdvancesAmount: Math.round(totalAdvancesAmount * 100) / 100,
      grossSalary: Math.round(grossSalary * 100) / 100,
      netSalary: Math.round(netSalary * 100) / 100,
      computedSalary: Math.round(netSalary * 100) / 100, // Keep backward compatible naming for computed salary
      daysAbsent,
      unpaidLeaveDeduction: Math.round(unpaidLeaveDeduction * 100) / 100,
    };
  });

  const managers = userStats.filter(u => u.role === 'MANAGER');
  const employees = userStats.filter(u => u.role !== 'MANAGER' && u.role !== 'ADMIN');

  return {
    managers,
    employees,
  };
};

/**
 * Gather all payslip details for a user.
 * 
 * @param {string} userId 
 * @param {string} organizationId 
 * @param {string} month  Format: "YYYY-MM"
 * @returns {Promise<Object|null>}
 */
const gatherPayslipData = async (userId, organizationId, month) => {
  const [year, m] = month.split('-').map(Number);

  // IST-safe boundaries — aligns with @db.Date records stored in IST
  const { startDate, endDate: endDateBoundary } = getISTDateBoundaries(month);

  const totalWorkingDays = getWorkingDaysInMonth(year, m);

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return null;

  const attendances = await prisma.attendance.findMany({
    where: { userId, date: { gte: startDate, lte: endDateBoundary } }
  });

  let presentDays = 0, lateDays = 0, absentDays = 0, halfDays = 0;
  attendances.forEach(a => {
    if (a.status === 'PRESENT') presentDays++;
    else if (a.status === 'LATE') lateDays++;
    else if (a.status === 'ABSENT') absentDays++;
    else if (a.status === 'HALF_DAY') halfDays++;
  });

  const presentCredit = presentDays + lateDays + (halfDays * 0.5);
  const effectiveWorkingDays = Math.min(presentCredit, totalWorkingDays);

  const baseSalary = user.baseSalary || 0;
  const bonus = user.bonus || 0;
  const perDaySalary = totalWorkingDays > 0 ? baseSalary / totalWorkingDays : 0;

  const { year: currentYear, month: currentMonth, day: currentDay } = getISTCurrentDateComponents();
  const isCurrentMonth = (year === currentYear && m === currentMonth);

  const denominator = isCurrentMonth ? getElapsedWorkingDays(year, m, currentDay) : totalWorkingDays;
  const daysAbsent = Math.max(0, denominator - effectiveWorkingDays);
  const unpaidLeaveDeduction = daysAbsent * perDaySalary;

  // Fetch approved advances for the month
  const advances = await prisma.advance.findMany({
    where: {
      userId,
      status: 'APPROVED',
      dateApproved: { gte: startDate, lte: endDateBoundary }
    },
    select: { amount: true }
  });
  const advancesDeduction = advances.reduce((sum, a) => sum + (a.amount || 0), 0);

  const netSalary = Math.max(0, (baseSalary - unpaidLeaveDeduction) + bonus - advancesDeduction);

  // Salary period: 1st of month → end of month (30th/31st)
  const periodStartDate = new Date(year, m - 1, 1);
  const periodEndDate = new Date(year, m, 0); // Last day of month m
  const dateFormatOptions = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' };
  const periodStart = periodStartDate.toLocaleDateString('en-GB', dateFormatOptions); // e.g. "1 Jun 2026"
  const periodEnd = periodEndDate.toLocaleDateString('en-GB', dateFormatOptions);     // e.g. "30 Jun 2026"

  return {
    user,
    month,
    totalWorkingDays,
    effectiveWorkingDays,
    baseSalary,
    bonus,
    perDaySalary,
    unpaidLeaveDeduction,
    advancesDeduction,
    netSalary,
    presentDays,
    lateDays,
    halfDays,
    absentDays,
    daysAbsent,
    periodStart,
    periodEnd
  };
};

/**
 * Update user salary structure.
 * 
 * @param {string} userId 
 * @param {string} organizationId 
 * @param {Object} updateData 
 * @returns {Promise<Object|null>}
 */
const updateSalaryStructure = async (userId, organizationId, { baseSalary, bonus }) => {
  // Verify user belongs to the org
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId },
  });

  if (!user) {
    return null;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      baseSalary: baseSalary !== undefined ? parseFloat(baseSalary) : undefined,
      bonus: bonus !== undefined ? parseFloat(bonus) : undefined,
    },
    select: {
      id: true,
      baseSalary: true,
      bonus: true,
    },
  });

  return updatedUser;
};

module.exports = {
  getSalaryList,
  updateSalaryStructure,
  gatherPayslipData,
};
