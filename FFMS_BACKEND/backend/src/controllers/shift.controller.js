const shiftService = require('../services/shift.service');
const { successResponse } = require('../utils/response');

const createShift = async (req, res, next) => {
  try {
    const { name, startTime, endTime, gracePeriod, halfDayThreshold, breakDuration, color } = req.body;
    const organizationId = req.user.organizationId;

    if (!name || !startTime || !endTime) {
      const err = new Error('Name, startTime, and endTime are required');
      err.statusCode = 400;
      throw err;
    }

    const shift = await shiftService.createShift({
      organizationId,
      name,
      startTime,
      endTime,
      gracePeriod,
      halfDayThreshold,
      breakDuration,
      color
    });

    console.log(`[ShiftController] Shift created by user ${req.user.id} in org ${organizationId}: ${shift.id}`);
    return successResponse(res, shift, 201);
  } catch (err) {
    next(err);
  }
};

const listShifts = async (req, res, next) => {
  try {
    const organizationId = req.user.organizationId;
    const shifts = await shiftService.getShifts(organizationId);
    return successResponse(res, shifts);
  } catch (err) {
    next(err);
  }
};

const getShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const shift = await shiftService.getShiftById(organizationId, id);
    if (!shift) {
      const err = new Error('Shift not found');
      err.statusCode = 404;
      throw err;
    }
    return successResponse(res, shift);
  } catch (err) {
    next(err);
  }
};

const updateShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    const shift = await shiftService.updateShift(organizationId, id, req.body);
    console.log(`[ShiftController] Shift updated by user ${req.user.id} in org ${organizationId}: ${shift.id}`);
    return successResponse(res, shift);
  } catch (err) {
    next(err);
  }
};

const deleteShift = async (req, res, next) => {
  try {
    const { id } = req.params;
    const organizationId = req.user.organizationId;
    await shiftService.deleteShift(organizationId, id);
    console.log(`[ShiftController] Shift deleted by user ${req.user.id} in org ${organizationId}: ${id}`);
    return successResponse(res, { message: 'Shift deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createShift,
  listShifts,
  getShift,
  updateShift,
  deleteShift
};
