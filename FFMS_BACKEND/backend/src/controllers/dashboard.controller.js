const dashboardService = require('../services/dashboard.service');
const { successResponse } = require('../utils/response');

/**
 * Get Admin/Manager Dashboard Stats
 */
const getAdminDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardService.getAdminDashboard(req.user.organizationId, req.user.role, req.user.id);
    return successResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Field Staff Dashboard Stats
 */
const getFieldStaffDashboard = async (req, res, next) => {
  try {
    const stats = await dashboardService.getFieldStaffDashboard(req.user.id, req.user.organizationId);
    return successResponse(res, stats);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminDashboard,
  getFieldStaffDashboard
};
