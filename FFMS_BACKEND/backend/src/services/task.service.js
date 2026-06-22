const prisma = require('../config/prisma');
const cloudinary = require('../config/cloudinary');
const { emitToUser, emitToOrgAdmins } = require('../config/socket');
const { sendPushNotification } = require('../utils/notification');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../utils/errors');
const { validateBase64Image } = require('../utils/validateBase64Image');
const logger = require('../config/logger');

/**
 * Upload multiple task completion images to Cloudinary
 */
const uploadCompletionImages = async (imageBufferArray) => {
  const uploadedUrls = [];
  for (const imgBase64 of imageBufferArray) {
    try {
      validateBase64Image(imgBase64);
      const formattedStr = imgBase64.startsWith('data:image') 
        ? imgBase64 
        : `data:image/jpeg;base64,${imgBase64}`;

      const res = await cloudinary.uploader.upload(formattedStr, {
        folder: 'ffms/completions',
        resource_type: 'image'
      });
      uploadedUrls.push(res.secure_url);
    } catch (err) {
      logger.error('Failed to upload completion image:', err);
    }
  }
  return uploadedUrls;
};

/**
 * Create Task and Assignments inside transaction
 */
const createTask = async (createdById, taskData, organizationId) => {
  const { assigneeIds, ...restTaskData } = taskData;

  // Use database transaction for multi-table writes
  const result = await prisma.$transaction(async (tx) => {
    // Validate all assignees belong to the organization
    const validUsers = await tx.user.findMany({
      where: {
        id: { in: assigneeIds },
        organizationId
      }
    });
    if (validUsers.length !== assigneeIds.length) {
      throw new BadRequestError('One or more assignees do not belong to your organization');
    }

    // 1. Create task
    const task = await tx.task.create({
      data: {
        ...restTaskData,
        dueDate: restTaskData.dueDate ? new Date(restTaskData.dueDate) : null,
        scheduledDate: restTaskData.scheduledDate ? new Date(restTaskData.scheduledDate) : null,
        organizationId,
        createdById
      }
    });

    // 2. Create TaskAssignments
    const assignments = await Promise.all(
      assigneeIds.map(async (userId) => {
        return tx.taskAssignment.create({
          data: {
            taskId: task.id,
            userId,
            status: 'ASSIGNED'
          },
          include: {
            user: {
              select: { id: true, name: true, employeeId: true }
            }
          }
        });
      })
    );

    return { task, assignments };
  });

  // Emit socket event and push notifications asynchronously
  result.assignments.forEach((assignment) => {
    // 1. Socket notification
    emitToUser(assignment.userId, 'task:assigned', {
      taskId: result.task.id,
      title: result.task.title,
      assignmentId: assignment.id
    });

    // 2. Push Notification & persistent database alert
    sendPushNotification(
      assignment.userId,
      'New Task Assigned',
      `You have been assigned the task: "${result.task.title}"`,
      { type: 'TASK', referenceId: result.task.id }
    ).catch(err => logger.error('Push notification failed:', err));
  });

  return result;
};

/**
 * List tasks with filters and role restrictions
 */
const listTasks = async ({
  organizationId,
  role,
  requestingUserId,
  status,
  priority,
  assigneeId,
  territoryId,
  projectId,
  startDate,
  endDate,
  page = 1,
  limit = 20
}) => {
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  // Filters setup
  const where = {
    organizationId,
    ...(priority && { priority }),
    ...(status && { status }),
    ...(territoryId && { territoryId }),
    ...(projectId && { projectId }),
    ...((startDate || endDate) && {
      dueDate: {
        ...(startDate && { gte: new Date(`${startDate}T00:00:00.000Z`) }),
        ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) })
      }
    })
  };

  // Role-based restrictions
  if (role === 'FIELD_STAFF' || role === 'OFFICE_STAFF') {
    // Field staff only sees their assigned tasks
    where.assignments = {
      some: {
        userId: requestingUserId
      }
    };
  } else if (role === 'MANAGER') {
    if (assigneeId) {
      where.assignments = {
        some: {
          userId: assigneeId
        }
      };
      where.createdById = requestingUserId;
    } else {
      where.OR = [
        { createdById: requestingUserId },
        { assignments: { some: { userId: requestingUserId } } }
      ];
    }
  } else if (role === 'ADMIN') {
    where.createdBy = {
      role: 'ADMIN'
    };
    if (assigneeId) {
      where.assignments = {
        some: {
          userId: assigneeId
        }
      };
    }
  }

  const total = await prisma.task.count({ where });

  const tasks = await prisma.task.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: (parsedPage - 1) * parsedLimit,
    take: parsedLimit,
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, employeeId: true }
          }
        }
      },
      territory: {
        select: { id: true, name: true }
      },
      project: {
        select: { id: true, name: true }
      }
    }
  });

  return {
    tasks,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      hasMore: parsedPage * parsedLimit < total
    }
  };
};

/**
 * Get Task by ID
 */
const getTaskById = async (id, organizationId) => {
  const task = await prisma.task.findFirst({
    where: { id, organizationId },
    include: {
      assignments: {
        include: {
          user: {
            select: { id: true, name: true, employeeId: true, phone: true }
          }
        }
      },
      createdBy: {
        select: { id: true, name: true, email: true }
      },
      territory: true,
      project: true,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: { id: true, name: true }
          }
        }
      }
    }
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  return task;
};

/**
 * Update Task
 */
const updateTask = async (id, updateData, organizationId) => {
  const task = await prisma.task.findFirst({
    where: { id, organizationId }
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      ...updateData,
      dueDate: updateData.dueDate ? new Date(updateData.dueDate) : task.dueDate,
      scheduledDate: updateData.scheduledDate ? new Date(updateData.scheduledDate) : task.scheduledDate
    }
  });

  return updatedTask;
};

/**
 * Delete Task
 */
const deleteTask = async (id, organizationId) => {
  const task = await prisma.task.findFirst({
    where: { id, organizationId }
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  await prisma.task.delete({
    where: { id }
  });

  return true;
};

/**
 * Update assignment status / complete task (FIELD_STAFF or MANAGER+)
 */
const updateAssignmentStatus = async (
  assignmentId,
  taskId,
  userId,
  organizationId,
  { status, completionNote, completionImages = [] },
  isManager = false
) => {
  // Validate that the task and assignment exists in this organization
  const assignment = await prisma.taskAssignment.findFirst({
    where: {
      id: assignmentId,
      taskId,
      task: { organizationId },
      // If not manager, ensure they can only update their own assignment
      ...(!isManager && { userId })
    },
    include: {
      task: true,
      user: {
        select: { name: true }
      }
    }
  });

  if (!assignment) {
    throw new NotFoundError('Task assignment not found or access denied');
  }

  // Update status transitions timestamps
  const updates = { status };
  if (status === 'ACCEPTED' || status === 'IN_PROGRESS') {
    if (status === 'ACCEPTED' && !assignment.acceptedAt) {
      updates.acceptedAt = new Date();
    }
    // Update main task status to IN_PROGRESS on first assignment accept or start
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' }
    });
  } else if (status === 'COMPLETED') {
    updates.completedAt = new Date();
    updates.completionNote = completionNote || null;

    // Process base64 uploads to Cloudinary if provided
    if (completionImages.length > 0) {
      const urls = await uploadCompletionImages(completionImages);
      updates.completionImages = urls;
    }
  }

  // Perform Update
  const updatedAssignment = await prisma.taskAssignment.update({
    where: { id: assignmentId },
    data: updates
  });

  // Post completion checks
  if (status === 'COMPLETED') {
    // 1. Notify organization managers/creators
    const taskCreator = assignment.task.createdById;
    emitToUser(taskCreator, 'task:completed', {
      taskId,
      assignmentId,
      taskTitle: assignment.task.title,
      userName: assignment.user.name
    });

    sendPushNotification(
      taskCreator,
      'Task Completed',
      `${assignment.user.name} has completed the task: "${assignment.task.title}"`,
      { type: 'TASK', referenceId: taskId }
    ).catch(err => logger.error('Completion notification failed:', err));

    // 2. Check if ALL assignees have completed their assignments
    const pendingAssignments = await prisma.taskAssignment.count({
      where: {
        taskId,
        status: { not: 'COMPLETED' }
      }
    });

    if (pendingAssignments === 0) {
      // Set main Task status to COMPLETED
      await prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED' }
      });
      logger.info(`Parent task ${taskId} marked as COMPLETED because all assignments are done.`);
    }
  }

  // Emit task update to organization managers so real-time dashboard refreshes
  emitToOrgAdmins(organizationId, 'task:updated', {
    taskId,
    assignmentId,
    status,
    taskTitle: assignment.task.title,
    userName: assignment.user.name,
    userId: assignment.user.id
  });

  return updatedAssignment;
};

/**
 * Add Comment
 */
const addComment = async (taskId, userId, content, organizationId) => {
  // Check that the task exists in the organization
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId }
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  // Create Comment
  const comment = await prisma.comment.create({
    data: {
      taskId,
      userId,
      content
    },
    include: {
      user: {
        select: { id: true, name: true }
      }
    }
  });

  return comment;
};

/**
 * List comments of a task
 */
const listComments = async (taskId, organizationId) => {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId }
  });

  if (!task) {
    throw new NotFoundError('Task not found');
  }

  return prisma.comment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'asc' },
    include: {
      user: {
        select: { id: true, name: true, profileImage: true }
      }
    }
  });
};

const getMyTasks = async (userId, organizationId, { page = 1, limit = 10, status, type = 'assigned' } = {}) => {
  const where = type === 'created' 
    ? { createdById: userId, organizationId, ...(status && { status }) }
    : { assignments: { some: { userId } }, organizationId, ...(status && { status }) };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: { dueDate: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        assignments: { 
          where: type === 'assigned' ? { userId } : {}, 
          select: { id: true, taskId: true, userId: true, status: true, assignedAt: true, acceptedAt: true, completionNote: true } 
        },
        territory: { select: { name: true } },
        createdBy: { select: { name: true, role: true } }
      },
    }),
    prisma.task.count({ where }),
  ])
  return { tasks, total, page, limit }
};

const assignTask = async (taskId, userId, assignedBy, organizationId) => {
  // Check task exists within the same organization
  const task = await prisma.task.findFirst({ where: { id: taskId, organizationId } })
  if (!task) {
    const err = new Error('Task not found'); err.statusCode = 404; throw err
  }

  // Check user exists within the same organization
  const user = await prisma.user.findFirst({ where: { id: userId, organizationId } })
  if (!user) {
    const err = new Error('User not found'); err.statusCode = 404; throw err
  }

  // Upsert — if already assigned just return existing
  const assignment = await prisma.taskAssignment.upsert({
    where: { taskId_userId: { taskId, userId } },
    update: { status: 'ASSIGNED', assignedAt: new Date() },
    create: { taskId, userId, status: 'ASSIGNED' },
  })

  // Update task status to IN_PROGRESS if it was PENDING
  if (task.status === 'PENDING') {
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'IN_PROGRESS' },
    })
  }

  return assignment
}

module.exports = {
  createTask,
  listTasks,
  getTaskById,
  updateTask,
  deleteTask,
  updateAssignmentStatus,
  addComment,
  listComments,
  getMyTasks,
  assignTask
};
