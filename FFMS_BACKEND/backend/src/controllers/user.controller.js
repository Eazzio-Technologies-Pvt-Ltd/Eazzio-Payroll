const userService = require('../services/user.service');
const { successResponse } = require('../utils/response');
const { createUserSchema, updateUserSchema, assignTerritorySchema, forceResetPasswordSchema } = require('../validations/user.validation');
const { BadRequestError } = require('../utils/errors');

/**
 * Create user
 */
const createUser = async (req, res, next) => {
  try {
    const parseResult = createUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const newUser = await userService.createUser(parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: newUser.id,
      newValues: newUser
    });

    return successResponse(res, newUser, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List users
 */
const listUsers = async (req, res, next) => {
  try {
    let { role, status, territoryId, managerId, search, page, limit, sortBy, sortOrder, cursor } = req.query;

    // Security: Managers can only see their own subordinates
    if (req.user.role === 'MANAGER') {
      managerId = req.user.id;
    }

    const result = await userService.listUsers({
      organizationId: req.user.organizationId,
      role,
      status,
      territoryId,
      managerId,
      search,
      page,
      limit,
      sortBy,
      sortOrder,
      cursor
    });

    return successResponse(res, result.users, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * Get user by id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id, req.user.organizationId);

    return successResponse(res, user);
  } catch (err) {
    next(err);
  }
};

/**
 * Update user
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = updateUserSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    // Capture old values for audit logging
    const oldUser = await userService.getUserById(id, req.user.organizationId);
    const updatedUser = await userService.updateUser(id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'UPDATE_USER',
      resource: 'User',
      resourceId: id,
      oldValues: oldUser,
      newValues: updatedUser
    });

    return successResponse(res, updatedUser);
  } catch (err) {
    next(err);
  }
};

/**
 * Soft delete user
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const oldUser = await userService.getUserById(id, req.user.organizationId);
    const deletedUser = await userService.deleteUser(id, req.user.organizationId);

    await req.logAudit({
      action: 'SOFT_DELETE_USER',
      resource: 'User',
      resourceId: id,
      oldValues: oldUser,
      newValues: deletedUser
    });

    return successResponse(res, { message: 'User soft-deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Assign territory
 */
const assignTerritory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = assignTerritorySchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const oldUser = await userService.getUserById(id, req.user.organizationId);
    const updatedUser = await userService.assignTerritory(id, parseResult.data.territoryId, req.user.organizationId);

    await req.logAudit({
      action: 'ASSIGN_TERRITORY',
      resource: 'User',
      resourceId: id,
      oldValues: oldUser,
      newValues: updatedUser
    });

    return successResponse(res, updatedUser);
  } catch (err) {
    next(err);
  }
};

/**
 * Force reset password
 */
const forceResetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = forceResetPasswordSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    await userService.forceResetPassword(id, parseResult.data.password, req.user.organizationId);

    await req.logAudit({
      action: 'FORCE_RESET_PASSWORD',
      resource: 'User',
      resourceId: id
    });

    return successResponse(res, { message: 'Password successfully reset by admin' });
  } catch (err) {
    next(err);
  }
};

/**
 * Get user performance metrics
 */
const getUserPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const stats = await userService.getUserPerformance(id, req.user.organizationId);

    return successResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

/**
 * Get User Hierarchy
 */
const getHierarchy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const hierarchy = await userService.getHierarchy(id, req.user.organizationId);
    
    return successResponse(res, hierarchy);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createUser,
  listUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignTerritory,
  forceResetPassword,
  getUserPerformance,
  getHierarchy
};
