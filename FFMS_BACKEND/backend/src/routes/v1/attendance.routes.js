const express = require('express');
const attendanceController = require('../../controllers/attendance.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all attendance routes
router.use(authenticate);
router.use(checkOrgAccess);

// Check-in and out (Field Staff)
router.post('/check-in', authorize('FIELD_STAFF', 'OFFICE_STAFF'), attendanceController.checkIn);
router.post('/check-out', authorize('FIELD_STAFF', 'OFFICE_STAFF'), attendanceController.checkOut);
router.post('/status-photo', authorize('FIELD_STAFF', 'OFFICE_STAFF'), attendanceController.uploadStatusPhoto);

// Live and aggregates (Manager+)
router.get('/today', authorize('ADMIN', 'MANAGER'), attendanceController.getTodayAttendance);
router.get('/summary', authorize('ADMIN', 'MANAGER'), attendanceController.getAttendanceSummary);

// Reports — MUST be before /:id to avoid Express matching 'report' as an ID param
router.get('/report/:userId', authorize('ADMIN', 'MANAGER'), attendanceController.generateAttendancePdf);
router.post('/report/:userId/email', authorize('ADMIN', 'MANAGER'), attendanceController.emailAttendancePdf);

// History and correction — generic /:id routes come AFTER named routes
router.get('/', attendanceController.listAttendance);
router.patch('/:id', authorize('ADMIN'), attendanceController.manualCorrection);

module.exports = router;
