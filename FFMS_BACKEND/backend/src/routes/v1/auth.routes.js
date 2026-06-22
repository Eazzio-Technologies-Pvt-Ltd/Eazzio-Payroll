const express = require('express');
const authController = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter } = require('../../middleware/rateLimit.middleware');

const router = express.Router();

// Apply separate auth endpoints rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticate, authController.logout);
router.post('/forgot-password', authLimiter, authController.forgotPassword);
router.post('/verify-otp', authLimiter, authController.verifyOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

// Profile
router.get('/me', authenticate, authController.me);
router.patch('/profile/image', authenticate, authController.updateProfileImage);

module.exports = router;
