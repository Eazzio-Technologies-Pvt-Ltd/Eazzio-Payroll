const express = require('express');
const locationController = require('../../controllers/location.controller');
const { authenticate, authorize, checkOrgAccess } = require('../../middleware/auth.middleware');

const router = express.Router();

// Apply auth to all location routes
router.use(authenticate);
router.use(checkOrgAccess);

// Batch update (Field staff only)
router.post('/batch', authorize('FIELD_STAFF', 'OFFICE_STAFF'), locationController.batchInsertLocation);

// Live locations (Manager+)
router.get('/live', authorize('ADMIN', 'MANAGER'), locationController.getLiveLocations);

// Playback history (Manager+)
router.get('/:userId/history', authorize('ADMIN', 'MANAGER'), locationController.getLocationHistory);


module.exports = router;
