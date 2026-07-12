const prisma = require('../config/prisma');
const logger = require('../config/logger');
const { createTask } = require('../services/task.service');

/**
 * Checks all active recurring tasks.
 * If the current date matches the recurrence rule (relative to the task's createdAt or dueDate),
 * it creates a new duplicate task.
 */
const processRecurringTasks = async () => {
  logger.info('[Worker] Checking for recurring tasks...');
  try {
    const activeRecurringTasks = await prisma.task.findMany({
      where: {
        recurring: true,
        status: { not: 'CANCELLED' }
      },
      include: {
        assignments: true
      }
    });

    const now = new Date();
    
    for (const task of activeRecurringTasks) {
      if (!task.recurrenceRule) continue;
      
      // Determine the reference date (when it was last created/due)
      const referenceDate = task.dueDate || task.createdAt;
      
      let shouldDuplicate = false;
      let nextDueDate = new Date(referenceDate);
      
      const timeDiffMs = now.getTime() - referenceDate.getTime();
      const diffDays = Math.floor(timeDiffMs / (1000 * 60 * 60 * 24));
      
      if (task.recurrenceRule === 'DAILY' && diffDays >= 1) {
        shouldDuplicate = true;
        nextDueDate.setDate(nextDueDate.getDate() + 1);
      } else if (task.recurrenceRule === 'WEEKLY' && diffDays >= 7) {
        shouldDuplicate = true;
        nextDueDate.setDate(nextDueDate.getDate() + 7);
      } else if (task.recurrenceRule === 'MONTHLY' && diffDays >= 30) {
        shouldDuplicate = true;
        nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      }

      if (shouldDuplicate) {
        // Prevent duplicating multiple times by ensuring no task with same title & exact nextDueDate exists
        const startOfNextDue = new Date(nextDueDate);
        startOfNextDue.setHours(0, 0, 0, 0);
        
        const endOfNextDue = new Date(nextDueDate);
        endOfNextDue.setHours(23, 59, 59, 999);

        const existingDuplicate = await prisma.task.findFirst({
          where: {
            title: task.title,
            createdById: task.createdById,
            dueDate: {
              gte: startOfNextDue,
              lte: endOfNextDue
            }
          }
        });

        if (!existingDuplicate) {
          logger.info(`[Worker] Duplicating recurring task: ${task.title}`);
          const assigneeIds = task.assignments.map(a => a.userId);
          
          await createTask(task.createdById, {
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: nextDueDate,
            latitude: task.latitude,
            longitude: task.longitude,
            address: task.address,
            territoryId: task.territoryId,
            projectId: task.projectId,
            recurring: true,
            recurrenceRule: task.recurrenceRule,
            assigneeIds
          }, task.organizationId);

          // Mark the old task as non-recurring so it doesn't duplicate again next period!
          // The NEW task becomes the active recurring one.
          await prisma.task.update({
            where: { id: task.id },
            data: { recurring: false }
          });
        }
      }
    }
  } catch (error) {
    logger.error('[Worker] Error processing recurring tasks:', error);
  }
};

const startRecurringTaskWorker = () => {
  // run once on start
  processRecurringTasks();
  // run every 1 hour (3600000 ms)
  setInterval(processRecurringTasks, 3600000);
};

module.exports = { startRecurringTaskWorker };
