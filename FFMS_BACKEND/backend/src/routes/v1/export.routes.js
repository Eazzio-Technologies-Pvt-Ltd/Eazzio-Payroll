const express = require('express');
const exportController = require('../../controllers/export.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');
const { exportLimiter } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

// Apply auth, org check and specific rate limit to all exports
router.use(authenticate);
router.use(checkOrgAccess);
router.use(exportLimiter);

// Export attendance (Manager+)
router.get('/attendance', authorize('ADMIN', 'MANAGER'), exportController.exportAttendance);

// Export visits (Manager+)
router.get('/visits', authorize('ADMIN', 'MANAGER'), exportController.exportVisits);


module.exports = router;
