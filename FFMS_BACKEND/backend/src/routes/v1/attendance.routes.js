const express = require('express');
const attendanceController = require('../../controllers/attendance.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all attendance routes
router.use(authenticate);
router.use(checkOrgAccess);

// Check-in and out (Field Staff)
router.post('/check-in', authorize('FIELD_STAFF'), attendanceController.checkIn);
router.post('/check-out', authorize('FIELD_STAFF'), attendanceController.checkOut);
router.post('/status-photo', authorize('FIELD_STAFF'), attendanceController.uploadStatusPhoto);

// Live and aggregates (Manager+)
router.get('/today', authorize('ADMIN', 'MANAGER'), attendanceController.getTodayAttendance);
router.get('/summary', authorize('ADMIN', 'MANAGER'), attendanceController.getAttendanceSummary);

// History and correction
router.get('/', attendanceController.listAttendance); // Authenticate middleware handles role restriction inside service
router.patch('/:id', authorize('ADMIN'), attendanceController.manualCorrection);


module.exports = router;
