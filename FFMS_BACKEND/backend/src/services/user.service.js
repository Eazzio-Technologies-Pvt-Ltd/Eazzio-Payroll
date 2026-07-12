const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendWelcomeEmail, sendForceResetEmail } = require('../utils/email');
const { NotFoundError, BadRequestError, ConflictError } = require('../utils/errors');
const logger = require('../config/logger');

/**
 * Generate a random temporary password
 */
const generateTempPassword = () => {
  return crypto.randomBytes(8).toString('hex');
};

/**
 * Create user
 */
const createUser = async (userData, organizationId) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email }
  });

  if (existingUser) {
    throw new ConflictError('User with this email already exists');
  }

  // Use provided password if exists, otherwise generate temporary one
  const plainPassword = userData.password || generateTempPassword();
  const passwordHash = await bcrypt.hash(plainPassword, 12);

  // Extract password from userData before saving to prisma
  const { password, ...prismaUserData } = userData;

  const newUser = await prisma.user.create({
    data: {
      ...prismaUserData,
      passwordHash,
      organizationId
    }
  });

  // Send welcome email asynchronously
  sendWelcomeEmail(newUser, plainPassword).catch((err) => {
    logger.error('Failed to send welcome email to:', newUser.email, err);
  });

  const { passwordHash: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

/**
 * List users with filters, search, and pagination
 */
const listUsers = async ({
  organizationId,
  role,
  status,
  territoryId,
  managerId,
  search,
  page = 1,
  limit = 20,
  sortBy = 'createdAt',
  sortOrder = 'desc',
  cursor
}) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  
  // Base query conditions
  const where = {
    organizationId,
    // Role filter
    ...(role && { role }),
    // Status filter
    ...(status && { status }),
    // Territory filter
    ...(territoryId && { territoryId }),
    // Manager filter
    ...(managerId && { managerId }),
    // Search query on name, email, employeeId
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  // Pagination options
  const paginationOptions = {};
  if (cursor) {
    paginationOptions.take = parsedLimit + 1;
    paginationOptions.cursor = { id: cursor };
    paginationOptions.skip = 1; // Skip the cursor element itself
  } else {
    paginationOptions.take = parsedLimit;
    paginationOptions.skip = (parsedPage - 1) * parsedLimit;
  }

  // Fetch total count for metadata
  const total = await prisma.user.count({ where });

  // Query records
  const users = await prisma.user.findMany({
    where,
    orderBy: { [sortBy]: sortOrder },
    ...paginationOptions,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      profileImage: true,
      employeeId: true,
      department: true,
      role: true,
      status: true,
      managerId: true,
      territoryId: true,
      shiftId: true,
      shift: {
        select: { id: true, name: true, startTime: true, endTime: true, color: true }
      },
      lastActiveAt: true,
      createdAt: true,
      updatedAt: true,
      manager: {
        select: { id: true, name: true, email: true }
      },
      territory: {
        select: { id: true, name: true }
      }
    }

  });

  let hasMore = false;
  let nextCursor = null;

  if (cursor) {
    if (users.length > parsedLimit) {
      hasMore = true;
      const nextUser = users.pop(); // Remove the extra record
      nextCursor = nextUser.id;
    }
  } else {
    hasMore = parsedPage * parsedLimit < total;
  }

  return {
    users,
    meta: {
      total,
      page: cursor ? undefined : parsedPage,
      limit: parsedLimit,
      hasMore,
      nextCursor
    }
  };
};

/**
 * Get user by id with full relations
 */
const getUserById = async (id, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id, organizationId },
    include: {
      manager: {
        select: { id: true, name: true, email: true, employeeId: true }
      },
      territory: true,
      shift: true,
      subordinates: {
        select: { id: true, name: true, email: true, role: true, status: true }
      }
    }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const { passwordHash: _, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

/**
 * Update user profile / settings
 */
const updateUser = async (id, updateData, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const dataToUpdate = { ...updateData };
  if (dataToUpdate.password) {
    dataToUpdate.passwordHash = await bcrypt.hash(dataToUpdate.password, 12);
    delete dataToUpdate.password;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: dataToUpdate,
    include: {
      territory: {
        select: { id: true, name: true }
      },
      shift: {
        select: { id: true, name: true, startTime: true, endTime: true, color: true }
      }
    }
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

/**
 * Soft delete (set status to INACTIVE)
 */
const deleteUser = async (id, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const deletedUser = await prisma.user.update({
    where: { id },
    data: { status: 'INACTIVE' }
  });

  const { passwordHash: _, ...userWithoutPassword } = deletedUser;
  return userWithoutPassword;
};

/**
 * Assign territory to user
 */
const assignTerritory = async (id, territoryId, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const territory = await prisma.territory.findFirst({
    where: { id: territoryId, organizationId }
  });

  if (!territory) {
    throw new NotFoundError('Territory not found');
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { territoryId }
  });

  const { passwordHash: _, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
};

/**
 * Force Reset Password
 */
const forceResetPassword = async (id, newPassword, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { id },
    data: {
      passwordHash,
      deviceToken: null // Invalidate all refresh tokens on force reset
    }
  });

  // Send forced reset password email asynchronously
  sendForceResetEmail(user, newPassword).catch((err) => {
    logger.error('Failed to send force reset email to:', user.email, err);
  });

  return true;
};

/**
 * Get User Performance aggregated stats
 */
const getUserPerformance = async (userId, organizationId) => {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId }
  });

  if (!user) {
    throw new NotFoundError('User not found');
  }

  // Get completed assignments count
  const completedTasks = await prisma.taskAssignment.count({
    where: {
      userId,
      status: 'COMPLETED'
    }
  });

  // Get average rating
  const ratings = await prisma.taskAssignment.aggregate({
    where: {
      userId,
      status: 'COMPLETED',
      rating: { not: null }
    },
    _avg: { rating: true }
  });

  // Get visit reports count
  const visitReportsCount = await prisma.visitReport.count({
    where: { userId }
  });

  // Get attendance stats
  const attendanceAggregates = await prisma.attendance.aggregate({
    where: { userId },
    _count: { id: true },
    _sum: { workingMinutes: true }
  });

  const totalAttendances = attendanceAggregates._count.id;
  const totalWorkingMinutes = attendanceAggregates._sum.workingMinutes || 0;

  const lateAttendances = await prisma.attendance.count({
    where: {
      userId,
      isLate: true
    }
  });

  const lateRate = totalAttendances > 0 ? (lateAttendances / totalAttendances) * 100 : 0;
  const avgWorkingHours = totalAttendances > 0 ? (totalWorkingMinutes / 60) / totalAttendances : 0;

  return {
    userId,
    userName: user.name,
    role: user.role,
    stats: {
      completedTasks,
      averageRating: ratings._avg.rating ? parseFloat(ratings._avg.rating.toFixed(2)) : 0,
      totalVisits: visitReportsCount,
      totalAttendances,
      lateAttendances,
      lateRate: parseFloat(lateRate.toFixed(2)),
      avgWorkingHours: parseFloat(avgWorkingHours.toFixed(2))
    }
  };
};

/**
 * Get User Hierarchy (Recursive CTE)
 */
const getHierarchy = async (rootUserId, organizationId) => {
  // Verify the root user exists and belongs to the org
  const rootUser = await prisma.user.findFirst({
    where: { id: rootUserId, organizationId }
  });

  if (!rootUser) {
    throw new NotFoundError('User not found in organization');
  }

  // Execute recursive CTE
  const result = await prisma.$queryRaw`
    WITH RECURSIVE EmployeeTree AS (
      SELECT 
        id, 
        name, 
        role, 
        "employeeId", 
        "managerId", 
        0 AS level
      FROM "User"
      WHERE id = ${rootUserId} AND "organizationId" = ${organizationId}
      
      UNION ALL
      
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        u."employeeId", 
        u."managerId", 
        et.level + 1
      FROM "User" u
      INNER JOIN EmployeeTree et ON u."managerId" = et.id
      WHERE u."organizationId" = ${organizationId}
    )
    SELECT * FROM EmployeeTree ORDER BY level, name;
  `;

  // Helper to build tree
  const buildTree = (nodes, parentId) => {
    return nodes
      .filter(n => n.managerId === parentId || (!parentId && !n.managerId))
      .map(n => ({
        ...n,
        // recursive CTE returns BigInt for count/level in some drivers, cast to Number
        level: Number(n.level),
        subordinates: buildTree(nodes, n.id)
      }));
  };

  // The CTE returns the root user with managerId = actual manager, 
  // but for building the tree from this root, we treat its managerId as null internally 
  // or we just find the root node directly.
  const rootNode = result.find(n => n.id === rootUserId);
  if (!rootNode) return null;
  
  const tree = {
    ...rootNode,
    level: Number(rootNode.level),
    subordinates: buildTree(result, rootUserId)
  };

  return tree;
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
