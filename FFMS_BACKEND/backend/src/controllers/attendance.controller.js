'use strict';
const attendanceService = require('../services/attendance.service');
const prisma = require('../config/prisma');
const { successResponse } = require('../utils/response');
const { checkInSchema, checkOutSchema, updateAttendanceSchema } = require('../validations/attendance.validation');
const { BadRequestError } = require('../utils/errors');
const PDFDocument = require('pdfkit');
const { sendEmail } = require('../utils/email');

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
    await req.logAudit({ action: 'ATTENDANCE_CHECK_IN', resource: 'Attendance', resourceId: attendance.id, newValues: attendance });
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
    await req.logAudit({ action: 'ATTENDANCE_CHECK_OUT', resource: 'Attendance', resourceId: attendance.id, newValues: attendance });
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
      userId, startDate, endDate, status, month, year, page, limit
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
    const oldAttendance = await prisma.attendance.findUnique({ where: { id } });
    const updated = await attendanceService.manualCorrection(id, parseResult.data, req.user.organizationId);
    await req.logAudit({ action: 'ATTENDANCE_MANUAL_CORRECTION', resource: 'Attendance', resourceId: id, oldValues: oldAttendance, newValues: updated });
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

// ─── Shared helper: format minutes to "Xh Ym" ────────────────────────────────
const formatDuration = (minutes) => {
  if (!minutes || minutes <= 0) return '--';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ─── Shared helper: gather attendance data for a user/month ──────────────────
const gatherAttendanceData = async (userId, organizationId, month) => {
  const [year, m] = month.split('-').map(Number);
  const startDate = new Date(year, m - 1, 1);
  const endDate = new Date(year, m, 0);
  const endDateBoundary = new Date(endDate);
  endDateBoundary.setHours(23, 59, 59, 999);

  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } });
  if (!user) return null;

  const attendances = await prisma.attendance.findMany({
    where: { userId, date: { gte: startDate, lte: endDateBoundary } },
    orderBy: { date: 'asc' }
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysInMonth = endDate.getDate();

  let presentDays = 0, lateDays = 0, absentDays = 0, halfDays = 0, workingDaysCount = 0;
  const tableRows = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const currentDate = new Date(year, m - 1, i);
    const dow = currentDate.getDay();
    const isWeekend = dow === 0; // Mon-Sat are working days; only Sunday is off
    if (!isWeekend) workingDaysCount++;

    const record = attendances.find(r => {
      const rd = new Date(r.date);
      return rd.getDate() === i && rd.getMonth() === (m - 1);
    });

    let statusStr, punchIn = '--:--', punchOut = '--:--', hoursWorked = '--';

    if (record) {
      statusStr = record.status;
      if (statusStr === 'PRESENT') presentDays++;
      else if (statusStr === 'LATE') lateDays++;
      else if (statusStr === 'HALF_DAY') halfDays++;
      else if (statusStr === 'ABSENT') absentDays++;

      if (record.checkInTime) {
        punchIn = new Date(record.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      if (record.checkOutTime) {
        punchOut = new Date(record.checkOutTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
      }
      hoursWorked = formatDuration(record.workingMinutes);
    } else {
      if (isWeekend) statusStr = 'WEEKEND';
      else if (currentDate > today) statusStr = 'UPCOMING';
      else { statusStr = 'ABSENT'; absentDays++; }
    }

    tableRows.push({
      date: currentDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      weekday: currentDate.toLocaleDateString('en-IN', { weekday: 'short' }),
      status: statusStr,
      punchIn,
      punchOut,
      hoursWorked,
      isWeekend,
      isFuture: !record && !isWeekend && currentDate > today
    });
  }

  return { user, month, year, m, workingDaysCount, presentDays, lateDays, halfDays, absentDays, tableRows };
};

// ─── Shared helper: draw attendance PDF onto a PDFDocument ───────────────────
const buildAttendancePdfDoc = (doc, { companyName, user, month, workingDaysCount, presentDays, lateDays, halfDays, absentDays, tableRows }) => {
  // ── Header ──
  doc.fontSize(20).font('Helvetica-Bold').text(companyName, { align: 'center' });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).strokeColor('#cccccc').lineWidth(1).stroke();
  doc.strokeColor('black').lineWidth(1);
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text('ATTENDANCE RECORD', { align: 'center', underline: true });
  doc.fontSize(12).font('Helvetica').text(`Month: ${month}`, { align: 'center' });
  doc.moveDown(1.5);

  // ── Employee Details ──
  doc.fontSize(12).font('Helvetica-Bold').text('Employee Details', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(11);
  doc.text(`Name           :  ${user.name}`);
  doc.text(`Employee ID  :  ${user.employeeId || 'N/A'}`);
  doc.text(`Designation   :  ${user.role || 'N/A'}`);
  if (user.email) doc.text(`Email            :  ${user.email}`);
  doc.moveDown(1.5);

  // ── Summary Stats ──
  doc.fontSize(12).font('Helvetica-Bold').text('Monthly Summary', { underline: true });
  doc.moveDown(0.5);
  doc.font('Helvetica').fontSize(11);

  const summaryItems = [
    ['Working Days', workingDaysCount],
    ['Present', presentDays],
    ['Late', lateDays],
    ['Half Day', halfDays],
    ['Absent', absentDays],
    ['Effective Days', (presentDays + lateDays + halfDays * 0.5).toFixed(1)]
  ];

  const colW = 83;
  const statY = doc.y;
  summaryItems.forEach((item, idx) => {
    const x = 50 + (idx * colW);
    doc.font('Helvetica').fontSize(9).text(item[0], x, statY, { width: colW - 4 });
    doc.font('Helvetica-Bold').fontSize(16).text(String(item[1]), x, statY + 14, { width: colW - 4 });
  });

  doc.moveDown(3.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.8);

  // ── Attendance Table ──
  const colX = { date: 50, weekday: 150, status: 210, punchIn: 305, punchOut: 385, hours: 465 };

  // Table Header
  doc.font('Helvetica-Bold').fontSize(10);
  doc.text('Date', colX.date, doc.y, { width: 95 });
  doc.text('Day', colX.weekday, doc.y - doc.currentLineHeight(), { width: 55 });
  doc.text('Status', colX.status, doc.y - doc.currentLineHeight(), { width: 90 });
  doc.text('Punch In', colX.punchIn, doc.y - doc.currentLineHeight(), { width: 78 });
  doc.text('Punch Out', colX.punchOut, doc.y - doc.currentLineHeight(), { width: 78 });
  doc.text('Hours', colX.hours, doc.y - doc.currentLineHeight(), { width: 55 });
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.4);

  doc.font('Helvetica').fontSize(10);

  for (const row of tableRows) {
    // Page overflow guard
    if (doc.y > 720) {
      doc.addPage();
      doc.font('Helvetica-Bold').fontSize(10);
      const headerY = doc.y;
      doc.text('Date', colX.date, headerY, { width: 95 });
      doc.text('Day', colX.weekday, headerY, { width: 55 });
      doc.text('Status', colX.status, headerY, { width: 90 });
      doc.text('Punch In', colX.punchIn, headerY, { width: 78 });
      doc.text('Punch Out', colX.punchOut, headerY, { width: 78 });
      doc.text('Hours', colX.hours, headerY, { width: 55 });
      doc.moveDown(0.3);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.4);
      doc.font('Helvetica').fontSize(10);
    }

    const rowY = doc.y;
    const isSpecial = row.isWeekend || row.isFuture;

    if (isSpecial) {
      doc.fillColor('#aaaaaa');
    } else if (row.status === 'ABSENT') {
      doc.fillColor('#cc3333');
    } else if (row.status === 'LATE') {
      doc.fillColor('#cc7700');
    } else if (row.status === 'HALF_DAY') {
      doc.fillColor('#2255cc');
    } else {
      doc.fillColor('black');
    }

    doc.text(row.date, colX.date, rowY, { width: 95 });
    doc.text(row.weekday, colX.weekday, rowY, { width: 55 });
    doc.text(isSpecial ? (row.isWeekend ? 'Weekend' : '--') : row.status, colX.status, rowY, { width: 90 });
    doc.fillColor(isSpecial ? '#aaaaaa' : 'black');
    doc.text(row.punchIn, colX.punchIn, rowY, { width: 78 });
    doc.text(row.punchOut, colX.punchOut, rowY, { width: 78 });
    doc.text(row.hoursWorked, colX.hours, rowY, { width: 55 });
    doc.fillColor('black');
    doc.moveDown(0.55);
  }

  doc.moveDown(1.5);
  // Footer
  doc.fontSize(9).font('Helvetica').fillColor('#888888');
  doc.text('This is a computer-generated attendance report.', { align: 'center' });
  doc.text(`Generated on: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, { align: 'center' });
  doc.fillColor('black');
};

/**
 * Generate Attendance PDF — streams directly to response
 */
const generateAttendancePdf = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { month, companyName } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'month query param is required (format: YYYY-MM)' });
    }

    const data = await gatherAttendanceData(userId, organizationId, month);
    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Attendance_${data.user.name.replace(/\s+/g, '_')}_${month}.pdf`);

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(res);
    buildAttendancePdfDoc(doc, { companyName: customCompanyName, ...data });
    doc.end();

  } catch (error) {
    console.error('[attendance.controller] generateAttendancePdf Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error generating attendance PDF' });
    }
  }
};

/**
 * Email Attendance PDF
 */
const emailAttendancePdf = async (req, res, next) => {
  try {
    const { organizationId } = req.user;
    const { userId } = req.params;
    const { month, companyName } = req.query;

    if (!month) {
      return res.status(400).json({ success: false, message: 'month query param is required (format: YYYY-MM)' });
    }

    const data = await gatherAttendanceData(userId, organizationId, month);
    if (!data) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!data.user.email) {
      return res.status(400).json({ success: false, message: `${data.user.name} has no email address on file. Please update their profile first.` });
    }

    const customCompanyName = companyName || 'Eazzio Technologies Pvt Ltd';

    // Generate PDF into buffer
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const buffers = [];
    doc.on('data', chunk => buffers.push(chunk));

    await new Promise((resolve, reject) => {
      doc.on('end', resolve);
      doc.on('error', reject);
      buildAttendancePdfDoc(doc, { companyName: customCompanyName, ...data });
      doc.end();
    });

    const pdfBuffer = Buffer.concat(buffers);

    await sendEmail({
      to: data.user.email,
      subject: `Attendance Record — ${month} — ${customCompanyName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Attendance Record — ${month}</h2>
          <p>Dear <strong>${data.user.name}</strong>,</p>
          <p>Please find your attendance record for <strong>${month}</strong> attached to this email.</p>
          <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
            <tr><td style="padding: 6px 0; color: #555;">Working Days:</td><td style="padding: 6px 0; font-weight: bold;">${data.workingDaysCount}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Present:</td><td style="padding: 6px 0;">${data.presentDays}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Late:</td><td style="padding: 6px 0;">${data.lateDays}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Half Day:</td><td style="padding: 6px 0;">${data.halfDays}</td></tr>
            <tr><td style="padding: 6px 0; color: #555;">Absent:</td><td style="padding: 6px 0;">${data.absentDays}</td></tr>
          </table>
          <p style="color: #888; font-size: 12px;">This is an auto-generated report from ${customCompanyName}.</p>
        </div>
      `,
      attachments: [
        {
          filename: `Attendance_${data.user.name.replace(/\s+/g, '_')}_${month}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ success: true, message: `Attendance report sent to ${data.user.email}` });

  } catch (error) {
    console.error('[attendance.controller] emailAttendancePdf Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: error.message || 'Server error sending attendance PDF email' });
    }
  }
};

module.exports = {
  checkIn,
  checkOut,
  listAttendance,
  getAttendanceSummary,
  getTodayAttendance,
  manualCorrection,
  uploadStatusPhoto,
  generateAttendancePdf,
  emailAttendancePdf
};
