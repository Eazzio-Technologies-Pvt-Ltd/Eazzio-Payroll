const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getSalaryList = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { month } = req.query; // format: "YYYY-MM"

    // Determine the date range
    let startDate, endDate;
    if (month) {
      const [year, m] = month.split('-');
      startDate = new Date(year, m - 1, 1);
      endDate = new Date(year, m, 0); // Last day of the month
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    // Include the full day for endDate
    const endDateBoundary = new Date(endDate);
    endDateBoundary.setHours(23, 59, 59, 999);

    // Calculate totalWorkingDays (Mon-Fri) to match mobile app logic
    let totalWorkingDays = 0;
    for (let d = new Date(startDate); d <= endDateBoundary; d.setDate(d.getDate() + 1)) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) totalWorkingDays++;
    }

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

    // Process data per user
    const userStats = users.map(user => {
      const userAttendances = attendances.filter(a => a.userId === user.id);

      // Calculate working days based on attendance
      let workingDays = 0;
      userAttendances.forEach(a => {
        if (a.status === 'PRESENT' || a.status === 'LATE') workingDays += 1;
        if (a.status === 'HALF_DAY') workingDays += 0.5;
      });

      // Calculate leaves within the month
      const userLeaves = leaves.filter(l => l.userId === user.id);
      let totalLeaves = 0;
      userLeaves.forEach(l => {
        // Calculate overlapping days between leave period and the selected month
        const leaveStart = l.startDate < startDate ? startDate : l.startDate;
        const leaveEnd = l.endDate > endDateBoundary ? endDateBoundary : l.endDate;
        if (leaveStart <= leaveEnd) {
          const diffTime = Math.abs(leaveEnd - leaveStart);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          totalLeaves += diffDays;
        }
      });

      // Compute salary matching mobile app logic
      const baseSalary = user.baseSalary || 0;
      const bonus = user.bonus || 0;
      
      let computedSalary = 0;
      if (baseSalary > 0 && totalWorkingDays > 0) {
        computedSalary = (workingDays / totalWorkingDays) * baseSalary;
      } else if (baseSalary > 0 && workingDays > 0) {
        computedSalary = (workingDays / 26.0) * baseSalary;
      }
      computedSalary += bonus;

      return {
        ...user,
        workingDays,
        totalLeaves,
        computedSalary: Math.round(computedSalary * 100) / 100, // round to 2 decimals
      };
    });

    // Separate into Managers and Employees
    const managers = userStats.filter(u => u.role === 'MANAGER');
    const employees = userStats.filter(u => u.role !== 'MANAGER' && u.role !== 'ADMIN');

    res.json({
      success: true,
      data: {
        managers,
        employees,
      },
    });
  } catch (error) {
    console.error('[salary.controller] getSalaryList Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to fetch salary data' } });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { baseSalary, bonus } = req.body;

    // Verify user belongs to the org
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
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

    res.json({ success: true, data: updatedUser });
  } catch (error) {
    console.error('[salary.controller] updateSalaryStructure Error:', error);
    res.status(500).json({ success: false, error: { message: 'Failed to update salary structure' } });
  }
};
