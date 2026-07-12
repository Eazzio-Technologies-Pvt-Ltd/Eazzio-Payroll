const express = require('express');
const salaryController = require('../../controllers/salary.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

// ── All salary routes require authentication ──
router.use(authenticate);

// ── Employee self-service (any authenticated user, no admin check) ──
router.get('/my-slip', salaryController.getMySlip);

// ── Admin-only routes below this middleware ──
router.use(authorize('ADMIN'));

router.get('/', salaryController.getSalaryList);
router.patch('/:userId', salaryController.updateSalaryStructure);
router.get('/slip/:userId', salaryController.generateSlip);
router.post('/slip/:userId/email', salaryController.emailSlip);
router.patch('/admin/toggle-slip/:userId', salaryController.toggleSlipAccess);

module.exports = router;
