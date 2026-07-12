'use strict';

/**
 * salaryUtils.js — Centralized salary/attendance date utilities
 *
 * Why IST hardcoded?
 *   Attendance records are stored with @db.Date truncated in IST (Asia/Kolkata, UTC+5:30).
 *   If date boundaries are built using JS local time or Date.UTC(), they can miss records
 *   when the server runs in UTC. Explicitly encoding +05:30 into the ISO string ensures
 *   the resulting UTC timestamp aligns with how Prisma stores @db.Date values.
 */

/**
 * Returns IST-aligned start and end Date objects for a given month string.
 *
 * @param {string} monthStr  Format: "YYYY-MM" (e.g. "2026-07")
 * @returns {{ startDate: Date, endDate: Date }}
 *   startDate → 1st of the month at 00:00:00 IST
 *   endDate   → last day of the month at 23:59:59.999 IST
 */
const getISTDateBoundaries = (monthStr) => {
  const [yearStr, mStr] = monthStr.split('-');
  const year = parseInt(yearStr, 10);
  const m = parseInt(mStr, 10); // 1-based

  // Last day of the month: day 0 of the *next* month
  const lastDay = new Date(year, m, 0).getDate();

  // Build ISO strings with explicit IST offset so JS creates the right UTC instants
  const startDate = new Date(`${year}-${mStr}-01T00:00:00+05:30`);
  const endDate   = new Date(`${year}-${mStr}-${String(lastDay).padStart(2, '0')}T23:59:59.999+05:30`);

  return { startDate, endDate };
};

/**
 * Counts working days in a month (Mon–Sat inclusive, Sunday excluded).
 * This is the single source of truth for working-day calculation across
 * salary list, salary slip, and attendance reports.
 *
 * @param {number} year   Full year, e.g. 2026
 * @param {number} month  1-based month, e.g. 7 for July
 * @returns {number}
 */
const getWorkingDaysInMonth = (year, month) => {
  // Build IST-aligned boundaries for the given month
  const mStr = String(month).padStart(2, '0');
  const { startDate, endDate } = getISTDateBoundaries(`${year}-${mStr}`);

  let count = 0;
  const d = new Date(startDate);
  while (d <= endDate) {
    if (d.getDay() !== 0) count++; // 0 = Sunday; Mon-Sat all count
    d.setDate(d.getDate() + 1);
  }
  return count;
};

module.exports = { getISTDateBoundaries, getWorkingDaysInMonth };
