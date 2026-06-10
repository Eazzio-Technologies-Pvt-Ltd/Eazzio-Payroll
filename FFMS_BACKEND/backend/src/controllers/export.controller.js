const prisma = require('../config/prisma');
const exporter = require('../utils/exporter');
const { BadRequestError } = require('../utils/errors');

/**
 * Export Attendance Report (Excel/PDF)
 */
const exportAttendance = async (req, res, next) => {
  try {
    const { format = 'excel', startDate, endDate, userId } = req.query;

    if (!startDate || !endDate) {
      throw new BadRequestError('startDate and endDate query parameters are required');
    }

    const where = {
      user: {
        organizationId: req.user.organizationId
      },
      date: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`)
      },
      ...(userId && { userId })
    };

    const records = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'asc' },
      include: {
        user: { select: { name: true, employeeId: true } }
      }
    });

    if (format === 'excel') {
      const buffer = await exporter.exportAttendanceExcel(records, startDate, endDate);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_to_${endDate}.xlsx`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      const doc = await exporter.exportAttendancePDF(records, startDate, endDate);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_to_${endDate}.pdf`);
      return doc.pipe(res);
    } else if (format === 'csv') {
      const csvData = exporter.exportAttendanceCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_report_${startDate}_to_${endDate}.csv`);
      return res.send(csvData);
    } else {
      throw new BadRequestError('Invalid export format. Allowed formats: excel, pdf, csv');
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Export Visit Reports (Excel/PDF)
 */
const exportVisits = async (req, res, next) => {
  try {
    const { format = 'excel', startDate, endDate, userId } = req.query;

    if (!startDate || !endDate) {
      throw new BadRequestError('startDate and endDate query parameters are required');
    }

    const where = {
      user: {
        organizationId: req.user.organizationId
      },
      createdAt: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T23:59:59.999Z`)
      },
      ...(userId && { userId })
    };

    const records = await prisma.visitReport.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true } }
      }
    });

    if (format === 'excel') {
      const buffer = await exporter.exportVisitsExcel(records, startDate, endDate);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=visits_report_${startDate}_to_${endDate}.xlsx`);
      return res.send(buffer);
    } else if (format === 'pdf') {
      const doc = await exporter.exportVisitsPDF(records, startDate, endDate);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=visits_report_${startDate}_to_${endDate}.pdf`);
      return doc.pipe(res);
    } else if (format === 'csv') {
      const csvData = exporter.exportVisitsCSV(records);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=visits_report_${startDate}_to_${endDate}.csv`);
      return res.send(csvData);
    } else {
      throw new BadRequestError('Invalid export format. Allowed formats: excel, pdf, csv');
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  exportAttendance,
  exportVisits
};
