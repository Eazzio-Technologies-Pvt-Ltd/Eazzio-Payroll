const prisma = require('../config/prisma');
const { getISTDateBoundaries, getWorkingDaysInMonth } = require('../utils/salaryUtils');


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

    // 4. Calculate gross salary
    let grossSalary = 0;
    if (baseSalary > 0) {
      grossSalary = (cappedDaysPresent * perDaySalary) + bonus;
    }

    // 5. Calculate deductions (e.g. late arrival streak penalty)
    const userDeductions = deductions.filter(d => d.userId === user.id);
    const totalDeductionDays = userDeductions.reduce((sum, d) => sum + (d.amountDays || 0), 0);
    const deductionsAmount = totalDeductionDays * perDaySalary;

    // 6. Calculate approved advances
    const userAdvances = advances.filter(ad => ad.userId === user.id);
    const totalAdvancesAmount = userAdvances.reduce((sum, ad) => sum + (ad.amount || 0), 0);

    // 7. Calculate net salary
    let netSalary = grossSalary - deductionsAmount - totalAdvancesAmount;
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
};
