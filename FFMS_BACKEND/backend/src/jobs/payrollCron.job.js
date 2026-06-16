const { Worker, Queue } = require('bullmq');
const prisma = require('../config/prisma');
const connection = require('../config/redis');
const logger = require('../config/logger');

// Setup queue
const payrollQueue = new Queue('payroll-cron', { connection });

// Function to add the repeating job
const initPayrollCron = async () => {
  // Run every night at midnight
  await payrollQueue.add('calculate-deductions', {}, {
    repeat: {
      pattern: '0 0 * * *'
    }
  });
  logger.info('[PayrollCron] Repeating job registered (0 0 * * *)');
};

const worker = new Worker('payroll-cron', async (job) => {
  if (job.name === 'calculate-deductions') {
    logger.info('[PayrollCron] Starting late arrival deduction check...');
    
    // Auto-close any open/abandoned sessions (older than 18 hours) across all users
    const now = new Date();
    const abandonedSessions = await prisma.attendance.findMany({
      where: {
        checkOutTime: null,
        checkInTime: { lt: new Date(now.getTime() - 18 * 60 * 60 * 1000) }
      }
    });

    for (const session of abandonedSessions) {
      await prisma.attendance.update({
        where: { id: session.id },
        data: {
          checkOutTime: session.checkInTime,
          workingMinutes: 0,
          status: 'ABSENT',
          isEarlyLogout: true
        }
      });
      logger.info(`[PayrollCron Auto-Checkout] Closed abandoned session ${session.id} for user ${session.userId} from date ${session.date.toISOString().substring(0, 10)}`);
    }

    // Logic: 3 consecutive lates = 2.5 days salary deduction
    // 1. Get all active field staff
    const users = await prisma.user.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, organizationId: true }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Look back at the last 7 days of attendance
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const user of users) {
      const recentAttendance = await prisma.attendance.findMany({
        where: {
          userId: user.id,
          date: { gte: sevenDaysAgo, lte: today }
        },
        orderBy: { date: 'asc' }
      });

      let consecutiveLates = 0;
      let penaltyAppliedDate = null;

      for (const record of recentAttendance) {
        if (record.isLate || record.status === 'LATE') {
          consecutiveLates++;
          
          // Rule: 3 consecutive lates
          if (consecutiveLates >= 3) {
            // Apply a 2.5-day deduction
            
            // Check if we already applied a penalty for this streak today or recently
            // Let's just create the deduction
            await prisma.payrollDeduction.create({
              data: {
                userId: user.id,
                type: 'LATE_ARRIVAL_STREAK',
                amountDays: 2.5,
                reason: '3 Consecutive late arrivals',
                dateApplied: today
              }
            });
            
            // Send Notification to Employee
            await prisma.notification.create({
              data: {
                userId: user.id,
                title: 'Payroll Deduction Alert',
                body: 'You have been marked late for 3 consecutive days. A 2.5-day salary deduction has been applied.',
                type: 'SYSTEM'
              }
            });

            logger.info(`[PayrollCron] Applied 2.5 day deduction to ${user.name} for 3 consecutive lates.`);
            
            consecutiveLates = 0; // Reset after penalty
          }
        } else if (record.status === 'PRESENT') {
          // Reset streak if on-time
          consecutiveLates = 0;
        }
      }
    }
    
    logger.info('[PayrollCron] Finished late arrival deduction check.');
  }
}, { connection });

worker.on('failed', (job, err) => {
  logger.error(`[PayrollCron] Job ${job.id} failed:`, err);
});

module.exports = { worker, initPayrollCron };
