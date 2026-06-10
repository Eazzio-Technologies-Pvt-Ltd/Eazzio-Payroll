const express = require('express');
const mapController = require('../../controllers/map.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

router.get('/token', authenticate, mapController.getMapplsToken);
router.get('/search', authenticate, mapController.searchLocation);
router.get('/reverse-geocode', authenticate, mapController.reverseGeocode);

module.exports = router;