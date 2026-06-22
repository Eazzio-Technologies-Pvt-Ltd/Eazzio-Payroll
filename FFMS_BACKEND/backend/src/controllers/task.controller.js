const taskService = require('../services/task.service');
const { successResponse } = require('../utils/response');
const { createTaskSchema, updateTaskSchema, updateAssignmentSchema, createCommentSchema } = require('../validations/task.validation');
const { BadRequestError } = require('../utils/errors');

/**
 * Create Task
 */
const createTask = async (req, res, next) => {
  try {
    const parseResult = createTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const result = await taskService.createTask(req.user.id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'CREATE_TASK',
      resource: 'Task',
      resourceId: result.task.id,
      newValues: result.task
    });

    return successResponse(res, result, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List Tasks
 */
const listTasks = async (req, res, next) => {
  try {
    const { status, priority, assigneeId, territoryId, projectId, startDate, endDate, page, limit } = req.query;

    const result = await taskService.listTasks({
      organizationId: req.user.organizationId,
      role: req.user.role,
      requestingUserId: req.user.id,
      status,
      priority,
      assigneeId,
      territoryId,
      projectId,
      startDate,
      endDate,
      page,
      limit
    });

    return successResponse(res, result.tasks, 200, result.meta);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Task by ID
 */
const getTaskById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id, req.user.organizationId);
    return successResponse(res, task);
  } catch (err) {
    next(err);
  }
};

/**
 * Update Task
 */
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = updateTaskSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const oldTask = await taskService.getTaskById(id, req.user.organizationId);
    const updated = await taskService.updateTask(id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'UPDATE_TASK',
      resource: 'Task',
      resourceId: id,
      oldValues: oldTask,
      newValues: updated
    });

    return successResponse(res, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Task
 */
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldTask = await taskService.getTaskById(id, req.user.organizationId);
    await taskService.deleteTask(id, req.user.organizationId);

    await req.logAudit({
      action: 'DELETE_TASK',
      resource: 'Task',
      resourceId: id,
      oldValues: oldTask
    });

    return successResponse(res, { message: 'Task deleted successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Task Assignment Status (Complete/Accept/Reject)
 */
const updateAssignmentStatus = async (req, res, next) => {
  try {
    const { id, assignmentId } = req.params;
    const parseResult = updateAssignmentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const isManager = ['ADMIN', 'MANAGER'].includes(req.user.role);

    const result = await taskService.updateAssignmentStatus(
      assignmentId,
      id,
      req.user.id,
      req.user.organizationId,
      parseResult.data,
      isManager
    );

    await req.logAudit({
      action: 'UPDATE_TASK_ASSIGNMENT',
      resource: 'TaskAssignment',
      resourceId: assignmentId,
      newValues: result
    });

    return successResponse(res, result);
  } catch (err) {
    next(err);
  }
};

/**
 * Add Comment
 */
const addComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = createCommentSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const comment = await taskService.addComment(id, req.user.id, parseResult.data.content, req.user.organizationId);

    return successResponse(res, comment, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List comments of a task
 */
const listComments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const comments = await taskService.listComments(id, req.user.organizationId);
    return successResponse(res, comments);
  } catch (err) {
    next(err);
  }
};

const getMyTasks = async (req, res, next) => {
  try {
    const { page, limit, status, type } = req.query;
    const data = await taskService.getMyTasks(req.user.id, {
      page: +page || 1,
      limit: +limit || 50,
      status,
      type: type || 'assigned', // 'assigned' | 'created'
    });
    return successResponse(res, data);
  } catch (err) { next(err); }
}

const assignTask = async (req, res, next) => {
  try {
    const assignment = await taskService.assignTask(
      req.params.id,
      req.body.userId,
      req.user.id,
      req.user.organizationId
    )
    return successResponse(res, assignment, 201)
  } catch (err) { next(err) }
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
