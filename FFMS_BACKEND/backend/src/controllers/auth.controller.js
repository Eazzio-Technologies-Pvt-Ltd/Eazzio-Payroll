const authService = require('../services/auth.service');
const { successResponse } = require('../utils/response');
const { loginSchema, registerSchema, forgotPasswordSchema, verifyOtpSchema, resetPasswordSchema } = require('../validations/auth.validation');
const { BadRequestError } = require('../utils/errors');


/**
 * Login
 */
const login = async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { email, password } = parseResult.data;
    const result = await authService.login(email, password, req.ip);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Write audit log
    await req.logAudit({
      action: 'LOGIN',
      resource: 'User',
      resourceId: result.user.id,
      newValues: { email }
    });

    return successResponse(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Register
 */
const register = async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const result = await authService.register(parseResult.data);
    
    // Write audit log
    if (req.logAudit) {
      await req.logAudit({
        action: 'REGISTER',
        resource: 'User',
        resourceId: result.user.id,
        newValues: { email: req.body.email }
      });
    }
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return successResponse(res, {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    }, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh Token
 */
const refresh = async (req, res, next) => {
  try {
    // Read refreshToken from cookies or authorization header if not present
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refresh(refreshToken);

    // Set new refresh token in httpOnly cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return successResponse(res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout
 */
const logout = async (req, res, next) => {
  try {
    if (req.user?.id) {
      await authService.logout(req.user.id);
      
      await req.logAudit({
        action: 'LOGOUT',
        resource: 'User',
        resourceId: req.user.id
      });
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });

    return successResponse(res, { message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Forgot Password (OTP Request)
 */
const forgotPassword = async (req, res, next) => {
  try {
    const parseResult = forgotPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { email } = parseResult.data;
    await authService.forgotPassword(email);

    return successResponse(res, { message: 'OTP sent to registered email address' });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify OTP
 */
const verifyOtp = async (req, res, next) => {
  try {
    const parseResult = verifyOtpSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { email, otp } = parseResult.data;
    const result = await authService.verifyOtp(email, otp);

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Reset Password
 */
const resetPassword = async (req, res, next) => {
  try {
    const parseResult = resetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { resetToken, newPassword } = parseResult.data;
    await authService.resetPassword(resetToken, newPassword);

    return successResponse(res, { message: 'Password successfully reset' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Profile (Me)
 */
const me = async (req, res, next) => {
  try {
    return successResponse(res, { user: req.user });
  } catch (err) {
    next(err);
  }
};

const updateProfileImage = async (req, res, next) => {
  try {
    const { base64Image } = req.body;
    const updatedUser = await authService.updateProfileImage(req.user.id, base64Image);
    return successResponse(res, { user: updatedUser });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  refresh,
  logout,
  forgotPassword,
  verifyOtp,
  resetPassword,
  me,
  register,
  updateProfileImage
};
