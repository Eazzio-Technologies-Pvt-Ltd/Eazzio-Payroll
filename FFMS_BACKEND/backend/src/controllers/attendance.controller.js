const attendanceService = require('../services/attendance.service');
const prisma = require('../config/prisma');
const { successResponse } = require('../utils/response');
const { checkInSchema, checkOutSchema, updateAttendanceSchema } = require('../validations/attendance.validation');
const { BadRequestError } = require('../utils/errors');

/**
 * Check In
 */
const checkIn = async (req, res, next) => {
  try {
    const parseResult = checkInSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const attendance = await attendanceService.checkIn(req.user.id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'ATTENDANCE_CHECK_IN',
      resource: 'Attendance',
      resourceId: attendance.id,
      newValues: attendance
    });

    return successResponse(res, attendance);
  } catch (err) {
    next(err);
  }
};

/**
 * Check Out
 */
const checkOut = async (req, res, next) => {
  try {
    const parseResult = checkOutSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const attendance = await attendanceService.checkOut(req.user.id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'ATTENDANCE_CHECK_OUT',
      resource: 'Attendance',
      resourceId: attendance.id,
      newValues: attendance
    });

    return successResponse(res, attendance);
  } catch (err) {
    next(err);
  }
};

/**
 * List Attendance
 */
const listAttendance = async (req, res, next) => {
  try {
    const { userId, startDate, endDate, status, month, year, page, limit } = req.query;

    const result = await attendanceService.listAttendance({
      organizationId: req.user.organizationId,
      requestingUser: req.user,
      userId,
      startDate,
      endDate,
      status,
      month,
      year,
      page,
      limit
    });

    return successResponse(res, result.records, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * Get stats per date range
 */
const getAttendanceSummary = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      throw new BadRequestError('startDate and endDate query parameters are required');
    }

    const summary = await attendanceService.getAttendanceSummary(startDate, endDate, req.user.organizationId, req.user);
    return successResponse(res, summary);
  } catch (err) {
    next(err);
  }
};

/**
 * Get live today's attendance status for all field staff
 */
const getTodayAttendance = async (req, res, next) => {
  try {
    const liveToday = await attendanceService.getTodayAttendance(req.user.organizationId, req.user);
    return successResponse(res, liveToday);
  } catch (err) {
    next(err);
  }
};

/**
 * Manual corrections by Admin
 */
const manualCorrection = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = updateAttendanceSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    // Capture old values for audit logging
    const oldAttendance = await prisma.attendance.findUnique({ where: { id } }); // We'll log it if found
    const updated = await attendanceService.manualCorrection(id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'ATTENDANCE_MANUAL_CORRECTION',
      resource: 'Attendance',
      resourceId: id,
      oldValues: oldAttendance,
      newValues: updated
    });

    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Upload Periodic Status Photo (Selfie + Back Camera)
 */
const uploadStatusPhoto = async (req, res, next) => {
  try {
    const { selfieBase64, backCameraBase64, latitude, longitude } = req.body;
    if (!selfieBase64 || !backCameraBase64) {
      throw new BadRequestError('Both selfie and back camera photos are required');
    }

    const result = await attendanceService.uploadStatusPhoto(req.user.id, { selfieBase64, backCameraBase64, latitude, longitude }, req.user.organizationId);
    
    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  checkIn,
  checkOut,
  listAttendance,
  getAttendanceSummary,
  getTodayAttendance,
  manualCorrection,
  uploadStatusPhoto
};
