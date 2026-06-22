const prisma = require('../config/prisma');
const { NotFoundError, BadRequestError } = require('../utils/errors');

const createRequest = async (userId, { amount, reason }) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User not found');
  }

  const advance = await prisma.advance.create({
    data: {
      userId,
      amount,
      reason,
      status: 'PENDING',
    },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });

  return advance;
};

const getMyHistory = async (userId) => {
  return prisma.advance.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
};

const getAllRequests = async (organizationId, { userId, status } = {}) => {
  const where = {
    user: {
      organizationId,
    },
    ...(userId && { userId }),
    ...(status && { status }),
  };

  return prisma.advance.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      },
      approvedBy: {
        select: { id: true, name: true }
      }
    }
  });
};

const approveRequest = async (id, approvedById, organizationId) => {
  const advance = await prisma.advance.findFirst({
    where: { id, user: { organizationId } }
  });
  if (!advance) {
    throw new NotFoundError('Advance request not found');
  }

  if (advance.status !== 'PENDING') {
    throw new BadRequestError(`Cannot approve request that is already ${advance.status}`);
  }

  return prisma.advance.update({
    where: { id },
    data: {
      status: 'APPROVED',
      dateApproved: new Date(),
      approvedById,
    },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });
};

const rejectRequest = async (id, approvedById, organizationId) => {
  const advance = await prisma.advance.findFirst({
    where: { id, user: { organizationId } }
  });
  if (!advance) {
    throw new NotFoundError('Advance request not found');
  }

  if (advance.status !== 'PENDING') {
    throw new BadRequestError(`Cannot reject request that is already ${advance.status}`);
  }

  return prisma.advance.update({
    where: { id },
    data: {
      status: 'REJECTED',
      approvedById,
    },
    include: {
      user: {
        select: { id: true, name: true, employeeId: true }
      }
    }
  });
};

module.exports = {
  createRequest,
  getMyHistory,
  getAllRequests,
  approveRequest,
  rejectRequest,
};
