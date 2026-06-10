const prisma = require('../config/prisma');

const createShift = async ({
  organizationId,
  name,
  startTime,
  endTime,
  gracePeriod = 15,
  halfDayThreshold = 4.5,
  breakDuration = 30,
  color = '#3b82f6'
}) => {
  return prisma.shift.create({
    data: {
      organizationId,
      name,
      startTime,
      endTime,
      gracePeriod: parseInt(gracePeriod, 10),
      halfDayThreshold: parseFloat(halfDayThreshold),
      breakDuration: parseInt(breakDuration, 10),
      color
    }
  });
};

const getShifts = async (organizationId) => {
  return prisma.shift.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'asc' }
  });
};

const getShiftById = async (organizationId, id) => {
  return prisma.shift.findFirst({
    where: { id, organizationId }
  });
};

const updateShift = async (organizationId, id, data) => {
  // Validate that the shift belongs to this org
  const existing = await prisma.shift.findFirst({
    where: { id, organizationId }
  });

  if (!existing) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.startTime !== undefined) updateData.startTime = data.startTime;
  if (data.endTime !== undefined) updateData.endTime = data.endTime;
  if (data.gracePeriod !== undefined) updateData.gracePeriod = parseInt(data.gracePeriod, 10);
  if (data.halfDayThreshold !== undefined) updateData.halfDayThreshold = parseFloat(data.halfDayThreshold);
  if (data.breakDuration !== undefined) updateData.breakDuration = parseInt(data.breakDuration, 10);
  if (data.color !== undefined) updateData.color = data.color;

  return prisma.shift.update({
    where: { id },
    data: updateData
  });
};

const deleteShift = async (organizationId, id) => {
  const existing = await prisma.shift.findFirst({
    where: { id, organizationId }
  });

  if (!existing) {
    const err = new Error('Shift not found');
    err.statusCode = 404;
    throw err;
  }

  return prisma.shift.delete({
    where: { id }
  });
};

module.exports = {
  createShift,
  getShifts,
  getShiftById,
  updateShift,
  deleteShift
};
