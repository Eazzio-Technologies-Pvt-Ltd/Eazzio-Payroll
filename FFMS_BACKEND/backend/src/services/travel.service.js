const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const logger = require('../config/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const { getLocalDate } = require('../utils/timezone');

const DEFAULT_TRAVEL_RATE = 4; // ₹4 per KM

/**
 * Upload meter proof image to Cloudinary
 */
const uploadMeterProof = async (base64Str) => {
  try {
    const formatted = base64Str.startsWith('data:image')
      ? base64Str
      : `data:image/jpeg;base64,${base64Str}`;
    const res = await cloudinary.uploader.upload(formatted, {
      folder: 'ffms/travel-proof',
      resource_type: 'image',
    });
    return res.secure_url;
  } catch (err) {
    logger.error('Failed to upload meter proof image:', err);
    throw new BadRequestError('Failed to upload meter proof image');
  }
};

/**
 * GET today's travel log for a user.
 * Returns null if no log exists for today.
 */
const getTodayTravelLog = async (userId) => {
  const today = getLocalDate();

  const log = await prisma.travelLog.findFirst({
    where: { userId, date: today },
  });

  if (!log) return null;

  // Get user's travel allowance rate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { travelAllowanceRate: true },
  });

  const rate = user?.travelAllowanceRate ?? DEFAULT_TRAVEL_RATE;

  return {
    ...log,
    allowanceRate: rate,
    allowanceAmount: log.allowanceAmount ?? (log.totalDistanceKm * rate),
  };
};

/**
 * Upsert today's travel log (create or update).
 * Accepts meter start, end, optional proof image.
 */
const upsertTravelLog = async (userId, { meterStart, meterEnd, proofImageBase64, notes }) => {
  if (meterStart == null && meterEnd == null) {
    throw new BadRequestError('At least meterStart or meterEnd must be provided');
  }

  const today = getLocalDate();

  // Query existing travel log first
  const existing = await prisma.travelLog.findFirst({
    where: { userId, date: today },
  });

  const finalStart = meterStart != null ? meterStart : (existing ? existing.meterStart : null);
  const finalEnd = meterEnd != null ? meterEnd : (existing ? existing.meterEnd : null);

  if (finalStart != null && finalEnd != null && finalEnd < finalStart) {
    throw new BadRequestError('meterEnd cannot be less than meterStart');
  }

  // Upload proof image if provided
  let proofImageUrl = undefined;
  if (proofImageBase64) {
    proofImageUrl = await uploadMeterProof(proofImageBase64);
  }

  // Get user's allowance rate
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { travelAllowanceRate: true },
  });
  const rate = user?.travelAllowanceRate ?? DEFAULT_TRAVEL_RATE;

  // Compute distance from meter readings
  const distance = (finalStart != null && finalEnd != null)
    ? Math.max(0, finalEnd - finalStart)
    : undefined;

  const allowanceAmount = distance != null ? distance * rate : undefined;

  let result;
  if (existing) {
    result = await prisma.travelLog.update({
      where: { id: existing.id },
      data: {
        ...(meterStart != null && { meterStart }),
        ...(meterEnd != null && { meterEnd }),
        ...(distance != null && { totalDistanceKm: distance }),
        ...(allowanceAmount != null && { allowanceAmount }),
        ...(proofImageUrl != null && { proofImageUrl }),
        ...(notes != null && { notes }),
      },
    });
  } else {
    result = await prisma.travelLog.create({
      data: {
        userId,
        date: today,
        meterStart: meterStart ?? null,
        meterEnd: meterEnd ?? null,
        totalDistanceKm: distance ?? 0,
        allowanceAmount: allowanceAmount ?? 0,
        proofImageUrl: proofImageUrl ?? null,
        notes: notes ?? null,
      },
    });
  }

  return {
    ...result,
    allowanceRate: rate,
  };
};

/**
 * Get travel history for a user (last N days, paginated).
 */
const getTravelHistory = async (userId, { page = 1, limit = 10 } = {}) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { travelAllowanceRate: true },
  });
  const rate = user?.travelAllowanceRate ?? DEFAULT_TRAVEL_RATE;

  const [logs, total] = await Promise.all([
    prisma.travelLog.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.travelLog.count({ where: { userId } }),
  ]);

  const enriched = logs.map((log) => ({
    ...log,
    allowanceRate: rate,
    allowanceAmount: log.allowanceAmount ?? (log.totalDistanceKm * rate),
  }));

  return { logs: enriched, total, page, limit, allowanceRate: rate };
};

/**
 * Get attendance monthly summary for a user.
 */
const getMonthlySummary = async (userId) => {
  const now = new Date();
  const localNow = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const year = localNow.getUTCFullYear();
  const month = localNow.getUTCMonth(); // 0-indexed

  const startOfMonth = new Date(Date.UTC(year, month, 1));
  const endOfMonth = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));

  const logs = await prisma.attendance.findMany({
    where: {
      userId,
      date: { gte: startOfMonth, lte: endOfMonth },
    },
    select: { status: true, date: true, sessionNumber: true },
  });

  // Deduplicate by date (only count unique days)
  const dayMap = new Map();
  for (const log of logs) {
    const dateKey = new Date(log.date).toISOString().split('T')[0];
    if (!dayMap.has(dateKey)) {
      dayMap.set(dateKey, log.status);
    }
  }

  let present = 0;
  let absent = 0;
  let leave = 0;

  for (const status of dayMap.values()) {
    if (status === 'LEAVE') leave++;
    else if (status === 'ABSENT') absent++;
    else present++;
  }

  // Business days in current month (Mon-Fri)
  let totalWorkingDays = 0;
  const today = new Date();
  const lastDay = new Date(year, month + 1, 0);
  for (let d = new Date(year, month, 1); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) totalWorkingDays++;
  }

  return { present, absent, leave, totalWorkingDays, month: month + 1, year };
};

const getUserMonthlyTravelAllowance = async (userId, year, month) => {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const logs = await prisma.travelLog.findMany({
    where: {
      userId,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { travelAllowanceRate: true },
  });
  const rate = user?.travelAllowanceRate ?? DEFAULT_TRAVEL_RATE;

  let totalDistanceKm = 0;
  let totalAllowanceAmount = 0;

  for (const log of logs) {
    totalDistanceKm += log.totalDistanceKm || 0;
    totalAllowanceAmount += log.allowanceAmount ?? ((log.totalDistanceKm || 0) * rate);
  }

  return {
    totalDistanceKm,
    allowanceRate: rate,
    totalAllowanceAmount,
    logs,
  };
};

module.exports = {
  getTodayTravelLog,
  upsertTravelLog,
  getTravelHistory,
  getMonthlySummary,
  getUserMonthlyTravelAllowance,
};
