const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const { emitToOrgAdmins } = require('../config/socket');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');
const { getLocalDate, getLocalHoursAndMinutes } = require('../utils/timezone');
const { validateLocationAgainstTerritory } = require('./geofence.service');


/**
 * Retrieve shift configuration from database or env fallback
 */
const getShiftConfig = (shift) => {
  if (shift) {
    const [startHours, startMinutes] = shift.startTime.split(':').map(Number);
    const [endHours, endMinutes] = shift.endTime.split(':').map(Number);
    return {
      startMinutes: startHours * 60 + startMinutes,
      endMinutes: endHours * 60 + endMinutes,
      lateThreshold: shift.gracePeriod
    };
  }

  const shiftStart = process.env.DEFAULT_SHIFT_START || '09:00';
  const shiftEnd = process.env.DEFAULT_SHIFT_END || '18:00';
  const lateThreshold = parseInt(process.env.LATE_THRESHOLD_MINUTES || '15');
  
  const [startHours, startMinutes] = shiftStart.split(':').map(Number);
  const [endHours, endMinutes] = shiftEnd.split(':').map(Number);

  return {
    startMinutes: startHours * 60 + startMinutes,
    endMinutes: endHours * 60 + endMinutes,
    lateThreshold
  };
};

// Calculate exact shift end date-time based on check-in local date
const getShiftEndTime = (checkInTime, shift) => {
  const { startMinutes, endMinutes } = getShiftConfig(shift);
  
  // Create a Date object in the user's local timezone corresponding to checkInTime
  const shiftEnd = new Date(checkInTime);
  shiftEnd.setHours(0, 0, 0, 0); // start of check-in day
  
  // Set to end minutes
  shiftEnd.setMinutes(endMinutes);
  
  // If endMinutes is less than startMinutes, shift ends on the next calendar day
  if (endMinutes < startMinutes) {
    shiftEnd.setDate(shiftEnd.getDate() + 1);
  }
  return shiftEnd;
};

/**
 * Perform base64 upload to Cloudinary
 */
const uploadSelfie = async (base64Str) => {
  try {
    const formattedStr = base64Str.startsWith('data:image') 
      ? base64Str 
      : `data:image/jpeg;base64,${base64Str}`;

    const res = await cloudinary.uploader.upload(formattedStr, {
      folder: 'ffms/selfies',
      resource_type: 'image'
    });
    return res.secure_url;
  } catch (err) {
    logger.error('Failed to upload selfie to Cloudinary:', err);
    throw new BadRequestError(`Failed to upload selfie: ${err.message || err}`);
  }
};

/**
 * Validate user location against their assigned territory.
 * Fetches territory and performs Haversine radius / polygon check.
 * 
 * @param {number} latitude 
 * @param {number} longitude 
 * @param {string} territoryId 
 * @param {string} action - 'check-in' or 'check-out' (for error messages)
 * @returns {{ distanceMeters: number|null }} - Distance for audit trail
 */
const validateGeofence = async (latitude, longitude, territoryId, action = 'check-in') => {
  if (!territoryId) {
    return { distanceMeters: null };
  }

  const territory = await prisma.territory.findUnique({
    where: { id: territoryId },
    select: { polygon: true, centerLat: true, centerLng: true, radius: true, name: true }
  });

  if (!territory) {
    return { distanceMeters: null };
  }

  // Skip validation if no geofence is configured at all
  if (!territory.polygon && territory.centerLat == null) {
    return { distanceMeters: null };
  }

  const { isValid, distanceMeters } = validateLocationAgainstTerritory(latitude, longitude, territory);

  if (!isValid) {
    const distanceInfo = distanceMeters != null
      ? ` You are ${distanceMeters}m away from "${territory.name}".`
      : '';

    if (action === 'check-in') {
      throw new BadRequestError(
        `Outside permitted location. You must be within your assigned territory to ${action}.${distanceInfo}`
      );
    } else {
      throw new BadRequestError(
        `Return to your assigned location to ${action}. You are outside the permitted geofence.${distanceInfo}`
      );
    }
  }

  return { distanceMeters };
};

/**
 * Check In Service
 * Processes daily attendance for Field Staff.
 * 
 * Workflow:
 * 1. Validates that user hasn't already checked in today.
 * 2. Fetches user's assigned Territory (Geofence).
 * 3. Validates location using Haversine radius check (preferred) or polygon ray-casting (fallback).
 * 4. Uploads the mandatory base64 Selfie to Cloudinary.
 * 5. Calculates "Late" status based on shift config.
 * 6. Commits record to Prisma DB and broadcasts a Socket.IO event to Admins.
 */
const checkIn = async (userId, { latitude, longitude, selfieBase64 }, organizationId) => {
  const now = new Date();
  
  // Date truncated to day in IST
  const todayDate = getLocalDate(now);

  // Auto-close any open/abandoned sessions from previous days (older than 18 hours)
  const openPastSessions = await prisma.attendance.findMany({
    where: {
      userId,
      checkOutTime: null,
      checkInTime: { lt: new Date(now.getTime() - 18 * 60 * 60 * 1000) }
    }
  });

  for (const session of openPastSessions) {
    await prisma.attendance.update({
      where: { id: session.id },
      data: {
        checkOutTime: session.checkInTime,
        workingMinutes: 0,
        status: 'ABSENT',
        isEarlyLogout: true
      }
    });
    logger.info(`[Auto-Checkout] Closed abandoned session ${session.id} for user ${userId} from date ${session.date.toISOString().substring(0, 10)}`);
  }

  // 1. Count today's sessions for the user and validate session state
  const todaySessions = await prisma.attendance.findMany({
    where: {
      userId,
      date: todayDate
    },
    orderBy: {
      sessionNumber: 'asc'
    }
  });

  const count = todaySessions.length;
  if (count >= 2) {
    throw new BadRequestError('Daily attendance limit reached');
  }

  if (count === 1) {
    const session1 = todaySessions[0];
    if (session1.checkOutTime === null) {
      throw new BadRequestError('Session 2 cannot begin until Session 1 is fully checked out.');
    }
  }

  const sessionNumber = count + 1;

  // 1.5 Fetch user record for territory + shift config
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      territoryId: true,
      shiftId: true,
      shift: true
    }
  });

  // 2. SERVER-SIDE GEOFENCE VALIDATION (Bug #1 fix)
  //    Uses Haversine radius check (preferred) with polygon fallback.
  //    Rejects request if user is outside permitted radius.
  const { distanceMeters: punchInDistance } = await validateGeofence(
    latitude, longitude, userRecord?.territoryId, 'check-in'
  );

  // 3. Upload mandatory selfie to Cloudinary (Bug #2 fix — selfie is now required by validation schema)
  if (!selfieBase64) {
    throw new BadRequestError('Selfie is required for attendance check-in');
  }
  const selfieUrl = await uploadSelfie(selfieBase64);

  // 4. Determine if late
  const { startMinutes, lateThreshold } = getShiftConfig(userRecord?.shift);
  
  // Get check-in time in minutes from midnight (local time)
  const { hours, minutes } = getLocalHoursAndMinutes(now);
  const currentMinutes = hours * 60 + minutes;
  const isLate = currentMinutes > (startMinutes + lateThreshold);

  // 5. Create Attendance record with distance audit trail
  const attendance = await prisma.attendance.create({
    data: {
      userId,
      date: todayDate,
      sessionNumber,
      checkInTime: now,
      checkInLatitude: latitude,
      checkInLongitude: longitude,
      punchInDistance,
      status: isLate ? 'LATE' : 'PRESENT',
      isLate,
      selfieUrl
    },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });

  // 6. Emit Socket.IO event to managers
  emitToOrgAdmins(organizationId, 'attendance:checkin', {
    attendanceId: attendance.id,
    userId,
    userName: attendance.user.name,
    employeeId: attendance.user.employeeId,
    checkInTime: now,
    status: attendance.status,
    isLate,
    sessionNumber
  });

  if (isLate) {
    emitToOrgAdmins(organizationId, 'attendance:alert', {
      type: 'LATE_CHECKIN',
      userId,
      userName: attendance.user.name,
      checkInTime: now,
      message: `${attendance.user.name} checked in late at ${now.toLocaleTimeString()}`
    });
  }

  return attendance;
};

/**
 * Check Out Service
 * 
 * Bug #2 fix: Now requires mandatory selfie and validates geofence location.
 */
const checkOut = async (userId, { latitude, longitude, selfieBase64 }, organizationId) => {
  const now = new Date();
  const todayDate = getLocalDate(now);

  // 1. Find the active/open session (can be from today or yesterday night shift)
  const openSession = await prisma.attendance.findFirst({
    where: {
      userId,
      checkOutTime: null
    },
    orderBy: {
      checkInTime: 'desc'
    },
    include: {
      user: {
        select: { name: true, shiftId: true, shift: true, territoryId: true }
      }
    }
  });

  if (!openSession) {
    throw new BadRequestError('No active session to check out from');
  }

  // 2. SERVER-SIDE GEOFENCE VALIDATION for punch-out (Bug #2 fix)
  const { distanceMeters: punchOutDistance } = await validateGeofence(
    latitude, longitude, openSession.user?.territoryId, 'check-out'
  );

  // 3. Upload mandatory punch-out selfie (Bug #2 fix)
  if (!selfieBase64) {
    throw new BadRequestError('Selfie is required for attendance check-out');
  }
  const punchOutSelfieUrl = await uploadSelfie(selfieBase64);

  // 4. Compute working minutes for this session (guarded to never be negative)
  const checkInTime = new Date(openSession.checkInTime);
  const workingMinutes = Math.max(0, Math.floor((now - checkInTime) / 60000));

  // 5. Determine if early logout using computed shift end date-time
  const shiftEndTime = getShiftEndTime(openSession.checkInTime, openSession.user?.shift);
  const isEarlyLogout = now < shiftEndTime;

  // 6. Determine Status based on cumulative working hours business rules
  const pastSessions = await prisma.attendance.findMany({
    where: {
      userId,
      date: openSession.date,
      id: { not: openSession.id }
    }
  });

  const pastWorkingMinutes = pastSessions.reduce((sum, s) => sum + (s.workingMinutes || 0), 0);
  const cumulativeWorkingMinutes = pastWorkingMinutes + workingMinutes;

  let calculatedStatus = openSession.status;
  if (cumulativeWorkingMinutes < 240) {
    calculatedStatus = 'ABSENT';
  } else if (cumulativeWorkingMinutes < 420) {
    calculatedStatus = 'HALF_DAY';
  } else {
    // If working > 7 hours, maintain 'LATE' if any session check-in was late
    const eitherLate = openSession.isLate || pastSessions.some(s => s.isLate);
    calculatedStatus = eitherLate ? 'LATE' : 'PRESENT';
  }

  // 7. Update record with location, selfie, and distance audit trail
  const updatedAttendance = await prisma.attendance.update({
    where: { id: openSession.id },
    data: {
      checkOutTime: now,
      checkOutLatitude: latitude,
      checkOutLongitude: longitude,
      punchOutDistance,
      punchOutSelfieUrl,
      workingMinutes,
      isEarlyLogout,
      status: calculatedStatus
    },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });

  // 8. Emit Socket event to managers
  emitToOrgAdmins(organizationId, 'attendance:checkout', {
    attendanceId: openSession.id,
    userId,
    userName: updatedAttendance.user.name,
    checkOutTime: now,
    workingMinutes,
    isEarlyLogout,
    sessionNumber: openSession.sessionNumber,
    calculatedStatus
  });

  if (isEarlyLogout) {
    emitToOrgAdmins(organizationId, 'attendance:alert', {
      type: 'EARLY_LOGOUT',
      userId,
      userName: updatedAttendance.user.name,
      checkOutTime: now,
      message: `${updatedAttendance.user.name} checked out early at ${now.toLocaleTimeString()}`
    });
  }

  return updatedAttendance;
};

/**
 * List attendance with filters and pagination
 */
const listAttendance = async ({
  organizationId,
  requestingUser,
  userId,
  startDate,
  endDate,
  status,
  month,
  year,
  page = 1,
  limit = 20
}) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  // Authorization check: Field staff and Office staff can only see their own attendance logs
  let targetUserId = userId;
  if (requestingUser.role === 'FIELD_STAFF' || requestingUser.role === 'OFFICE_STAFF') {
    targetUserId = requestingUser.id;
  }

  const effectiveStartDate = startDate || endDate;
  const effectiveEndDate = endDate || startDate;

  const dateFilters = {};
  if (effectiveStartDate) {
    dateFilters.gte = new Date(effectiveStartDate);
  }
  if (effectiveEndDate) {
    dateFilters.lte = new Date(effectiveEndDate);
  }
  if (month || year) {
    const y = year ? parseInt(year) : new Date().getFullYear();
    const m = month ? parseInt(month) - 1 : 0;
    dateFilters.gte = new Date(Date.UTC(y, m, 1));
    dateFilters.lte = new Date(Date.UTC(y, m + (month ? 1 : 12), 0));
  }

  const where = {
    user: {
      organizationId,
      ...(requestingUser.role === 'MANAGER' && { managerId: requestingUser.id })
    },
    ...(targetUserId && { userId: targetUserId }),
    ...(status && { status }),
    ...(Object.keys(dateFilters).length > 0 && { date: dateFilters })
  };

  const total = await prisma.attendance.count({ where });

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });

  // Calculate stats for target user (if querying a single user)
  let statsSummary = null;
  if (targetUserId) {
    let hasAccess = true;
    if (requestingUser.role === 'MANAGER') {
      const isSubordinate = await prisma.user.findFirst({
        where: { id: targetUserId, managerId: requestingUser.id }
      });
      if (!isSubordinate) {
        hasAccess = false;
      }
    }

    if (hasAccess) {
      const summaryAggregates = await prisma.attendance.aggregate({
        where: { userId: targetUserId },
        _count: { id: true },
        _sum: { workingMinutes: true }
      });

      const totalDays = summaryAggregates._count.id;
      const totalMinutes = summaryAggregates._sum.workingMinutes || 0;

      const presentDays = await prisma.attendance.count({
        where: { userId: targetUserId, status: { in: ['PRESENT', 'LATE'] } }
      });

      const lateDays = await prisma.attendance.count({
        where: { userId: targetUserId, isLate: true }
      });

      const earlyLogouts = await prisma.attendance.count({
        where: { userId: targetUserId, isEarlyLogout: true }
      });

      statsSummary = {
        totalRecords: totalDays,
        presentDays,
        lateDays,
        earlyLogouts,
        avgWorkingHours: totalDays > 0 ? parseFloat(((totalMinutes / 60) / totalDays).toFixed(2)) : 0
      };
    }
  }

  return {
    records,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      hasMore: parsedPage * parsedLimit < total,
      summary: statsSummary
    }
  };
};

/**
 * Get attendance stats per date range
 */
const getAttendanceSummary = async (startDate, endDate, organizationId, requestingUser = null) => {
  const where = {
    user: {
      organizationId,
      ...(requestingUser && requestingUser.role === 'MANAGER' && { managerId: requestingUser.id })
    },
    date: {
      gte: new Date(`${startDate}T00:00:00.000Z`),
      lte: new Date(`${endDate}T23:59:59.999Z`)
    }
  };

  const totalRecords = await prisma.attendance.count({ where });
  const totalPresent = await prisma.attendance.count({
    where: { ...where, status: { in: ['PRESENT', 'LATE'] } }
  });
  const totalAbsent = await prisma.attendance.count({
    where: { ...where, status: 'ABSENT' }
  });
  const totalLate = await prisma.attendance.count({
    where: { ...where, isLate: true }
  });

  const workingMinutesAggregate = await prisma.attendance.aggregate({
    where,
    _sum: { workingMinutes: true },
    _count: { workingMinutes: true }
  });

  const sumMinutes = workingMinutesAggregate._sum.workingMinutes || 0;
  const countMinutes = workingMinutesAggregate._count.workingMinutes || 1;
  const avgWorkingHours = (sumMinutes / 60) / countMinutes;

  return {
    totalPresent,
    totalAbsent,
    totalLate,
    avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2)),
    totalRecords
  };
};

/**
 * Live today's attendance status for all field staff
 */
const getTodayAttendance = async (organizationId, requestingUser = null) => {
  const todayDate = getLocalDate();

  // Fetch all active field staff users
  const staffUsers = await prisma.user.findMany({
    where: {
      organizationId,
      role: { in: ['FIELD_STAFF', 'OFFICE_STAFF'] },
      status: 'ACTIVE',
      ...(requestingUser && requestingUser.role === 'MANAGER' && { managerId: requestingUser.id })
    },
    select: {
      id: true,
      name: true,
      employeeId: true,
      phone: true,
      profileImage: true,
      attendances: {
        where: { date: todayDate },
        orderBy: { sessionNumber: 'asc' }
      }
    }
  });

  // Format response indicating check-in status
  return staffUsers.map(staff => {
    const att = staff.attendances[staff.attendances.length - 1] || null;

    return {
      userId: staff.id,
      name: staff.name,
      employeeId: staff.employeeId,
      phone: staff.phone,
      profileImage: staff.profileImage,
      checkedIn: !!att,
      checkInTime: att ? att.checkInTime : null,
      checkOutTime: att ? att.checkOutTime : null,
      status: att ? att.status : 'ABSENT',
      isLate: att ? att.isLate : false,
      selfieUrl: att ? att.selfieUrl : null,
      attendances: staff.attendances
    };
  });
};

/**
 * Manual correction of attendance record by admin
 */
const manualCorrection = async (id, updateData, organizationId) => {
  const record = await prisma.attendance.findFirst({
    where: {
      id,
      user: { organizationId }
    }
  });

  if (!record) {
    throw new NotFoundError('Attendance record not found');
  }

  // If checkInTime or checkOutTime are changed, recalculate working minutes
  let workingMinutes = record.workingMinutes;
  const checkIn = updateData.checkInTime ? new Date(updateData.checkInTime) : record.checkInTime;
  const checkOut = updateData.checkOutTime ? new Date(updateData.checkOutTime) : record.checkOutTime;

  if (checkIn && checkOut) {
    workingMinutes = Math.floor((new Date(checkOut) - new Date(checkIn)) / 60000);
  }

  const updatedRecord = await prisma.attendance.update({
    where: { id },
    data: {
      ...updateData,
      workingMinutes
    }
  });

  return updatedRecord;
};

/**
 * Upload periodic status photo
 */
const uploadStatusPhoto = async (userId, { selfieBase64, backCameraBase64, latitude, longitude }, organizationId) => {
  // Upload both to cloudinary
  const selfieUrl = await uploadSelfie(selfieBase64);
  const backUrl = await uploadSelfie(backCameraBase64); // reuse same function as it just uploads to ffms/selfies

  // Save as a VisitReport of type OTHER
  const report = await prisma.visitReport.create({
    data: {
      userId,
      customerName: 'Internal System',
      visitType: 'OTHER',
      notes: 'Periodic 15-Minute Status Photo',
      latitude,
      longitude,
      images: [selfieUrl, backUrl],
    }
  });

  return report;
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
