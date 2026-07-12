const express = require('express');
const paymentController = require('../../controllers/payment.controller');
const { authenticate } = require('../../middleware/auth.middleware');

const router = express.Router();

// All routes protected with existing authenticate middleware
router.use(authenticate);

router.post('/create-order', paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.get('/subscription', paymentController.getSubscription);

module.exports = router;
