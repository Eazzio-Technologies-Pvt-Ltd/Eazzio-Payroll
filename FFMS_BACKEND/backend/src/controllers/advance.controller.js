const advanceService = require('../services/advance.service');
const { successResponse } = require('../utils/response');

const create = async (req, res, next) => {
  try {
    const advance = await advanceService.createRequest(req.user.id, req.body);
    return successResponse(res, advance, 201);
  } catch (err) { next(err); }
};

const getMy = async (req, res, next) => {
  try {
    const advances = await advanceService.getMyHistory(req.user.id);
    return successResponse(res, advances);
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const { userId, status } = req.query;
    const advances = await advanceService.getAllRequests(req.user.organizationId, { userId, status });
    return successResponse(res, advances);
  } catch (err) { next(err); }
};

const approve = async (req, res, next) => {
  try {
    const advance = await advanceService.approveRequest(req.params.id, req.user.id);
    return successResponse(res, advance);
  } catch (err) { next(err); }
};

const reject = async (req, res, next) => {
  try {
    const advance = await advanceService.rejectRequest(req.params.id, req.user.id);
    return successResponse(res, advance);
  } catch (err) { next(err); }
};

module.exports = { create, getMy, getAll, approve, reject };
