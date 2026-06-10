const express = require('express');
const shiftController = require('../../controllers/shift.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all shift endpoints
router.use(authenticate);
router.use(checkOrgAccess);

// Routes
router.get('/', authorize('ADMIN', 'MANAGER'), shiftController.listShifts);
router.get('/:id', authorize('ADMIN', 'MANAGER', 'FIELD_STAFF'), shiftController.getShift);
router.post('/', authorize('ADMIN'), shiftController.createShift);
router.patch('/:id', authorize('ADMIN'), shiftController.updateShift);
router.delete('/:id', authorize('ADMIN'), shiftController.deleteShift);

module.exports = router;
