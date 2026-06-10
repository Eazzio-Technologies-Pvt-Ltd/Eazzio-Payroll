const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { authorize } = require('../../middleware/auth.middleware');
const travelController = require('../../controllers/travel.controller');

// All travel routes require authentication
router.use(authenticate);

/**
 * GET /api/v1/travel/my/today
 * Field staff gets today's travel log
 */
router.get('/my/today', travelController.getMyTodayTravel);

/**
 * PATCH /api/v1/travel/my/today
 * Upsert today's travel log (meter readings + optional proof photo)
 */
router.patch('/my/today', travelController.upsertMyTravelLog);

/**
 * GET /api/v1/travel/my
 * Get paginated travel history for current user
 */
router.get('/my', travelController.getMyTravelHistory);

/**
 * GET /api/v1/travel/attendance/monthly-summary
 * Get monthly attendance summary for current user
 */
router.get('/attendance/monthly-summary', travelController.getMonthlyAttendanceSummary);

/**
 * GET /api/v1/travel/all
 * Admins/managers get travel logs summary for an employee
 */
router.get('/all', authorize('ADMIN', 'MANAGER'), travelController.getAllTravelLogs);

module.exports = router;
