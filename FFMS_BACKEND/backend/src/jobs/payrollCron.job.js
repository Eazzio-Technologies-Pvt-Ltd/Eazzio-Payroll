const { Worker, Queue } = require('bullmq');
const prisma = require('../config/prisma');
const connection = require('../config/redis');
const logger = require('../config/logger');
const { closeAbandonedSessions } = require('../utils/sessionCleanup');

// Setup queue
const payrollQueue = new Queue('payroll-cron', { connection });

// Function to add the repeating job
const initPayrollCron = async () => {
  // Drain any stale repeatable jobs from prior deploys to prevent duplicates
  const existing = await payrollQueue.getRepeatableJobs();
  for (const job of existing) {
    await payrollQueue.removeRepeatableByKey(job.key);
  }

  // Run every night at midnight
  await payrollQueue.add('calculate-deductions', {}, {
    repeat: {
      pattern: '0 0 * * *'
    },
    // Overlap guard: BullMQ will not start a new run until the previous one finishes
    // when using a unique jobId for repeatable jobs. removeOnComplete/Fail keeps the
    // queue clean and prevents stale job data from accumulating.
    removeOnComplete: { count: 5 },  // keep last 5 completed for debugging
    removeOnFail: { count: 10 }       // keep last 10 failures for debugging
  });
  logger.info('[PayrollCron] Repeating job registered (0 0 * * *)');
};

const worker = new Worker('payroll-cron', async (job) => {
  if (job.name === 'calculate-deductions') {
    logger.info('[PayrollCron] Starting nightly payroll job...');
    
    // ─── Phase 1: Close abandoned sessions ───────────────────────────
    // Uses the shared utility which:
    //   - Calculates per-user threshold based on their assigned shift
    //   - Falls back to ABANDONED_SESSION_HOURS env var (default 24h) if no shift
    //   - Includes a race-condition guard (checks checkOutTime before updating)
    //   - Calculates actual working minutes instead of zeroing them out
    const closedCount = await closeAbandonedSessions({ source: 'CRON' });
    logger.info(`[PayrollCron] Phase 1 complete: ${closedCount} abandoned session(s) closed`);

    // ─── Phase 2: Late arrival deduction check ───────────────────────
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
    
    logger.info('[PayrollCron] Finished nightly payroll job.');
  }
}, {
  connection,
  // Concurrency = 1 ensures the cron cannot double-process if BullMQ retries overlap
  concurrency: 1
});

worker.on('failed', (job, err) => {
  logger.error(`[PayrollCron] Job ${job.id} failed:`, err);
});

module.exports = { worker, initPayrollCron };
