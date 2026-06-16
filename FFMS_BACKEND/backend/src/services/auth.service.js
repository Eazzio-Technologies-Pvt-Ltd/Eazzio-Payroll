const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const redis = require('../config/redis');
const cloudinary = require('../config/cloudinary');
const { signAccessToken, signRefreshToken, hashToken } = require('../utils/jwt');
const { refreshTokenSecret } = require('../config/jwt');
const { sendOTPEmail } = require('../utils/email');
const { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Hash utility for OTPs
 */
const hashOtp = (email, otp) => {
  return crypto.createHmac('sha256', email).update(otp).digest('hex');
};

/**
 * Generate 6-digit OTP
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Login service
 */
const login = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: true, territory: true, shift: true }
  });

  if (!user) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.status === 'SUSPENDED' || user.status === 'INACTIVE') {
    throw new ForbiddenError(`Your account is ${user.status.toLowerCase()}. Access denied.`);
  }

  const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordMatch) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const accessToken = signAccessToken(user.id, user.role, user.organizationId);
  const refreshToken = signRefreshToken(user.id);


  // Let's continue writing auth.service assuming `refreshToken` is on User.
  const hashedRefreshToken = hashToken(refreshToken);

  // We'll update the User's refreshToken field in database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastActiveAt: new Date(),
      // We will add refreshToken to the database model
      deviceToken: hashedRefreshToken // Or let's store it here, or we can use another field. Let's put it in deviceToken or edit schema.prisma to add refreshToken.
    }
  });

  const { passwordHash: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    accessToken,
    refreshToken
  };
};

/*Register Service*/
const register = async (data) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new BadRequestError('Email already exists');
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  // Auto-generate organization if not provided
  let orgId = data.organizationId;
  if (!orgId) {
    const slug = data.companyName ? data.companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now() : 'org-' + Date.now();
    const org = await prisma.organization.create({
      data: {
        name: data.companyName || `${data.name}'s Organization`,
        slug: slug,
        isActive: true
      }
    });
    orgId = org.id;
  }

  const user = await prisma.user.create({
    data: {
      name: data.name,
      employeeId: data.employeeId || 'EMP-ADMIN-' + Date.now(),
      email: data.email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      organization: {
        connect: {
          id: orgId
        }
      }
    },
    include: { organization: true, territory: true, shift: true }
  });

  const { passwordHash: _, ...userWithoutPassword } = user;

  const accessToken = signAccessToken(user.id, user.role, user.organizationId);
  const refreshToken = signRefreshToken(user.id);
  const hashedRefreshToken = hashToken(refreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { deviceToken: hashedRefreshToken }
  });

  return { 
    user: userWithoutPassword,
    accessToken,
    refreshToken
  };
};

/**
 * Refresh token service
 */
const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token is required');
  }

  let decoded;
  try {
    decoded = jwt.verify(refreshToken, refreshTokenSecret);
  } catch (err) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId }
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new UnauthorizedError('User not found or inactive');
  }

  // Compare hashed refresh tokens
  const incomingHashed = hashToken(refreshToken);
  if (user.deviceToken !== incomingHashed) {
    // Invalidate refresh token on compromise
    await prisma.user.update({
      where: { id: user.id },
      data: { deviceToken: null }
    });
    throw new UnauthorizedError('Compromised refresh token. Please login again.');
  }

  // Rotate tokens
  const newAccessToken = signAccessToken(user.id, user.role, user.organizationId);
  const newRefreshToken = signRefreshToken(user.id);
  const newHashed = hashToken(newRefreshToken);

  await prisma.user.update({
    where: { id: user.id },
    data: { deviceToken: newHashed }
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
};

/**
 * Logout service
 */
const logout = async (userId) => {
  await prisma.user.update({
    where: { id: userId },
    data: { deviceToken: null }
  });
  return true;
};

/**
 * Forgot password - Generate OTP
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new NotFoundError('User with this email does not exist');
  }

  // Rate Limiting: 3 OTP requests per hour using Redis
  const rateLimitKey = `otp_limit:${email}`;
  const requestCount = await redis.get(rateLimitKey);

  if (requestCount && parseInt(requestCount) >= 3) {
    throw new BadRequestError('Too many OTP requests. Maximum 3 per hour allowed.');
  }

  // Generate 6-digit OTP
  const otp = generateOtp();
  const hashedOtp = hashOtp(email, otp);

  // Store hashed OTP in Redis with 15min (900 seconds) expiry
  const otpKey = `otp:${email}`;
  await redis.set(otpKey, hashedOtp, 'EX', 900);

  // Increment rate limit counter
  if (!requestCount) {
    await redis.set(rateLimitKey, 1, 'EX', 3600); // 1 hour window
  } else {
    await redis.incr(rateLimitKey);
  }

  // Send OTP email
  await sendOTPEmail(email, otp);
  logger.info(`OTP generated and sent to ${email}`);

  return true;
};

/**
 * Verify OTP and return short-lived reset token (5 minutes)
 */
const verifyOtp = async (email, otp) => {
  const otpKey = `otp:${email}`;
  const storedHashedOtp = await redis.get(otpKey);

  if (!storedHashedOtp) {
    throw new BadRequestError('OTP has expired or does not exist');
  }

  const incomingHashedOtp = hashOtp(email, otp);
  if (storedHashedOtp !== incomingHashedOtp) {
    throw new BadRequestError('Invalid OTP');
  }

  // Generate short-lived reset token (5 minutes)
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenKey = `reset_token:${resetToken}`;

  // Store reset token associated with the email in Redis for 5 minutes (300 seconds)
  await redis.set(resetTokenKey, email, 'EX', 300);

  // Delete the OTP once verified successfully
  await redis.del(otpKey);

  return { resetToken };
};

/**
 * Reset password using the reset token
 */
const resetPassword = async (resetToken, newPassword) => {
  const resetTokenKey = `reset_token:${resetToken}`;
  const email = await redis.get(resetTokenKey);

  if (!email) {
    throw new BadRequestError('Reset token has expired or is invalid');
  }

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  // Update password and invalidate all refresh tokens (deviceToken)
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: newPasswordHash,
      deviceToken: null
    }
  });

  // Delete the reset token
  await redis.del(resetTokenKey);

  logger.info(`Password successfully reset for user ${email}`);
  return true;
};

/**
 * Update user's profile image (only allowed once)
 */
const updateProfileImage = async (userId, base64Image) => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Check if profile photo already exists or is locked
  if (user.profileImageLockedAt || user.profileImage) {
    throw new BadRequestError('Profile photo is locked and can only be set once for security verification');
  }

  if (!base64Image) {
    throw new BadRequestError('Base64 image is required');
  }

  // Upload to Cloudinary
  const formatted = base64Image.startsWith('data:image')
    ? base64Image
    : `data:image/jpeg;base64,${base64Image}`;

  let profileImageUrl;
  try {
    const res = await cloudinary.uploader.upload(formatted, {
      folder: 'ffms/profiles',
      resource_type: 'image',
    });
    profileImageUrl = res.secure_url;
  } catch (err) {
    logger.error('Failed to upload profile image:', err);
    throw new BadRequestError('Failed to upload profile image to cloud storage');
  }

  // Save to database and lock
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      profileImage: profileImageUrl,
      profileImageLockedAt: new Date()
    },
    include: {
      organization: true,
      territory: true,
      shift: true
    }
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  register,
  updateProfileImage
};
