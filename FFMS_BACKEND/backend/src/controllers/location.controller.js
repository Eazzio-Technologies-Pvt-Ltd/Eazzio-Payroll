const locationService = require('../services/location.service');
const { successResponse } = require('../utils/response');
const { batchLocationSchema, locationHistorySchema } = require('../validations/location.validation');
const { BadRequestError } = require('../utils/errors');

/**
 * Batch insert location logs
 */
const batchInsertLocation = async (req, res, next) => {
  try {
    const parseResult = batchLocationSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { locations } = parseResult.data;
    const result = await locationService.batchInsertLocation(req.user.id, locations, req.user.organizationId);

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get live status of all active field staff locations
 */
const getLiveLocations = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (userId) {
      const live = await locationService.getSingleLiveLocation(userId, req.user.organizationId);
      return successResponse(res, live);
    }
    const liveLocations = await locationService.getLiveLocations(
      req.user.organizationId,
      req.user.role === 'MANAGER' ? req.user.id : null
    );
    return successResponse(res, liveLocations);
  } catch (err) {
    next(err);
  }
};

/**
 * Get route playback history of location logs for a user
 */
const getLocationHistory = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const parseResult = locationHistorySchema.safeParse(req.query);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const { startDate, endDate } = parseResult.data;
    const history = await locationService.getLocationHistory(userId, startDate, endDate, req.user.organizationId);

    return successResponse(res, history);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  batchInsertLocation,
  getLiveLocations,
  getLocationHistory
};
