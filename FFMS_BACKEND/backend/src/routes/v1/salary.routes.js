const express = require('express');
const salaryController = require('../../controllers/salary.controller');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/slip/:userId', salaryController.generateSlip);

router.use(authorize('ADMIN'));

router.get('/', salaryController.getSalaryList);
router.patch('/:userId', salaryController.updateSalaryStructure);
router.post('/slip/:userId/email', salaryController.emailSlip);

module.exports = router;
