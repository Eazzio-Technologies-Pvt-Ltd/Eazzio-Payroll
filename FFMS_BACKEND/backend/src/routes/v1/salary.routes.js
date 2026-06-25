const express = require('express');
const salaryController = require('../../controllers/salary.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.use(authorize('ADMIN'));

router.get('/', salaryController.getSalaryList);
router.patch('/:userId', salaryController.updateSalaryStructure);

module.exports = router;
