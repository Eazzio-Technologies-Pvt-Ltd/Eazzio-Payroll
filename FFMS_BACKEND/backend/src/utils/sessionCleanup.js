const prisma = require('../config/prisma');
const logger = require('../config/logger');

/**
 * ABANDONED SESSION GRACE PERIOD (hours beyond shift duration)
 * 
 * When a user has an assigned Shift, the threshold is computed as:
 *   shiftDurationMinutes + ABANDONED_GRACE_HOURS (default 4h)
 * 
 * When a user has NO shift, we fall back to the flat env var:
 *   ABANDONED_SESSION_HOURS (default 24h)
 */
const ABANDONED_GRACE_HOURS = parseInt(process.env.ABANDONED_GRACE_HOURS || '4', 10);
const ABANDONED_SESSION_HOURS_FLAT = parseInt(process.env.ABANDONED_SESSION_HOURS || '24', 10);

/**
 * Calculate shift duration in minutes from HH:MM start/end strings.
 * Handles overnight shifts (e.g. 22:00 → 06:00 = 8 hours).
 */
const getShiftDurationMinutes = (startTime, endTime) => {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  // Overnight shift: end is on the next calendar day
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
};

/**
 * Calculate the abandoned threshold (in milliseconds) for a given session.
 * 
 * Strategy:
 *   - If the session's user has an assigned shift → shiftDuration + grace period
 *   - Otherwise → flat ABANDONED_SESSION_HOURS env var (default 24h)
 * 
 * @param {Object|null} shift  The user's Shift record (with startTime, endTime)
 * @returns {number} Threshold in milliseconds
 */
const getAbandonedThresholdMs = (shift) => {
  if (shift && shift.startTime && shift.endTime) {
    const shiftDurationMin = getShiftDurationMinutes(shift.startTime, shift.endTime);
    const graceMin = ABANDONED_GRACE_HOURS * 60;
    return (shiftDurationMin + graceMin) * 60 * 1000;
  }

  // No shift assigned — use flat fallback
  return ABANDONED_SESSION_HOURS_FLAT * 60 * 60 * 1000;
};

/**
 * Close a single abandoned attendance session.
 * 
 * Instead of zeroing out workingMinutes, this calculates actual elapsed time
 * from checkInTime to the auto-close timestamp, preserving partial-day work data.
 * 
 * @param {Object} session  The Attendance record to close
 * @param {Date}   closeAt  The timestamp to use as the checkout time
 * @param {string} source   'CRON' | 'CHECKIN' — for log tracing
 * @returns {Object} The updated attendance record
 */
const closeAbandonedSession = async (session, closeAt, source = 'CRON') => {
  // Guard: session already closed (race condition protection)
  const current = await prisma.attendance.findUnique({
    where: { id: session.id },
    select: { checkOutTime: true }
  });

  if (!current || current.checkOutTime !== null) {
    logger.info(`[SessionCleanup:${source}] Session ${session.id} already closed — skipping (race guard)`);
    return null;
  }

  // Calculate actual working minutes from check-in to auto-close time
  const checkInTime = new Date(session.checkInTime);
  const actualWorkingMinutes = Math.max(0, Math.floor((closeAt - checkInTime) / 60000));

  // Determine status based on actual working time
  // < 4h = ABSENT, 4-7h = HALF_DAY, otherwise keep original status
  let status;
  if (actualWorkingMinutes < 240) {
    status = 'ABSENT';
  } else if (actualWorkingMinutes < 420) {
    status = 'HALF_DAY';
  } else {
    status = session.status === 'LATE' ? 'LATE' : 'PRESENT';
  }

  const updated = await prisma.attendance.update({
    where: { id: session.id },
    data: {
      checkOutTime: closeAt,
      workingMinutes: actualWorkingMinutes,
      status,
      isEarlyLogout: true,
      notes: `Auto-closed by ${source}: employee did not check out`
    }
  });

  logger.info(
    `[SessionCleanup:${source}] Closed abandoned session ${session.id} ` +
    `for user ${session.userId} from ${session.date.toISOString().substring(0, 10)} ` +
    `(worked ${actualWorkingMinutes} min → ${status})`
  );

  return updated;
};

/**
 * Find and close all abandoned sessions for a given user (or all users if userId is null).
 * 
 * This is the single shared function called by:
 *   1. payrollCron.job.js  — globally for all users at midnight
 *   2. attendance.service.js checkIn() — per-user when they check in again
 * 
 * @param {Object}      options
 * @param {string|null}  options.userId   Scope to one user, or null for all users
 * @param {string}       options.source   'CRON' | 'CHECKIN' — for log tracing
 * @returns {number} Count of sessions closed
 */
const closeAbandonedSessions = async ({ userId = null, source = 'CRON' } = {}) => {
  const now = new Date();

  // Build the base query — open sessions only
  const baseWhere = {
    checkOutTime: null,
    ...(userId && { userId })
  };

  // Fetch open sessions with user's shift info for per-session threshold calculation
  const openSessions = await prisma.attendance.findMany({
    where: baseWhere,
    include: {
      user: {
        select: {
          shift: {
            select: { startTime: true, endTime: true }
          }
        }
      }
    }
  });

  let closedCount = 0;

  for (const session of openSessions) {
    if (!session.checkInTime) continue;

    // Calculate threshold based on this user's shift
    const thresholdMs = getAbandonedThresholdMs(session.user?.shift);
    const cutoff = new Date(now.getTime() - thresholdMs);

    // Only close if check-in is older than the threshold
    if (new Date(session.checkInTime) < cutoff) {
      const result = await closeAbandonedSession(session, now, source);
      if (result) closedCount++;
    }
  }

  if (closedCount > 0) {
    logger.info(`[SessionCleanup:${source}] Closed ${closedCount} abandoned session(s)`);
  }

  return closedCount;
};

module.exports = {
  closeAbandonedSessions,
  closeAbandonedSession,
  getAbandonedThresholdMs,
  getShiftDurationMinutes
};
