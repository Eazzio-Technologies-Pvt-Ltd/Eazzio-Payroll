const { z } = require('zod');

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name must be at most 100 characters'),
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be at most 128 characters'),
  companyName: z.string().trim().min(2).max(200).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be exactly 6 digits')
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

module.exports = {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  verifyOtpSchema,
  resetPasswordSchema
};
