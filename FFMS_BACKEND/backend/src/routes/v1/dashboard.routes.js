const express = require('express');
const dashboardController = require('../../controllers/dashboard.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all dashboard routes
router.use(authenticate);
router.use(checkOrgAccess);

// Admin dashboard (Admin+)
router.get('/admin', authorize('ADMIN', 'MANAGER'), dashboardController.getAdminDashboard);


// Field staff dashboard (Field staff own only)
router.get('/field-staff', authorize('FIELD_STAFF', 'OFFICE_STAFF'), dashboardController.getFieldStaffDashboard);

module.exports = router;
