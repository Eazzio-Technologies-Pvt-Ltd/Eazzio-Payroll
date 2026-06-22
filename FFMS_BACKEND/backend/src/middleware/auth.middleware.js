const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');
const { accessTokenSecret } = require('../config/jwt');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Authenticate JWT from Authorization header
 * 
 * SECURITY ARCHITECTURE:
 * 1. Extracts the Bearer token.
 * 2. Verifies the signature using the highly-secure `accessTokenSecret`.
 * 3. Extracts the payload and verifies the user exists and is `ACTIVE` in the DB.
 * 4. Injects a sanitized `req.user` payload into the Express pipeline.
 * NOTE: If token is expired, it specifically returns `{ expired: true }` so the frontend
 * intercepts it and fires a silent Token Rotation request.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Access token is required');
    }

    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, accessTokenSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token expired', { expired: true });
      }
      throw new UnauthorizedError('Invalid access token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { organization: true, territory: true, shift: true }
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError(`User status is ${user.status}. Access denied.`);
    }

    // Attach user and organization details to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      territoryId: user.territoryId,
      managerId: user.managerId,
      employeeId: user.employeeId,
      status: user.status,
      baseSalary: user.baseSalary,
      travelAllowanceRate: user.travelAllowanceRate,
      profileImage: user.profileImage,
      profileImageLockedAt: user.profileImageLockedAt,
      organization: user.organization,
      territory: user.territory,
      shift: user.shift
    };

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * RBAC (Role-Based Access Control) Middleware
 * Checks if the authenticated `req.user.role` exists in the allowedRoles array.
 * @param {...string} allowedRoles (e.g. 'ADMIN', 'MANAGER', 'FIELD_STAFF')
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('You do not have permission to perform this action'));
    }

    next();
  }
};

/**
 * Ensure user belongs to organization
 */
const checkOrgAccess = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required'));
  }

  // Ensure user has an organization assigned
  if (!req.user.organizationId) {
    return next(new ForbiddenError('User has no organization assigned'));
  }

  // Block cross-org access attempts
  const requestedOrgId = req.params.orgId || req.body.organizationId || req.query.organizationId;
  if (requestedOrgId && requestedOrgId !== req.user.organizationId) {
    logger.warn('SECURITY_EVENT', {
      type: 'CROSS_ORG_ACCESS_ATTEMPT',
      userId: req.user.id,
      userOrgId: req.user.organizationId,
      requestedOrgId,
      path: req.originalUrl,
      ip: req.ip,
    });
    return next(new ForbiddenError('Cross-organization access is prohibited'));
  }

  next();
};

module.exports = {
  authenticate,
  authorize,
  checkOrgAccess
};
