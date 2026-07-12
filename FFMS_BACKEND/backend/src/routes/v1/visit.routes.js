const express = require('express');
const controller = require('../../controllers/visit.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

// All visit routes require authentication
router.use(authenticate);

router.post('/', controller.createVisit);

module.exports = router;
