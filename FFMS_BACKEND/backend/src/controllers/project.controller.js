const projectService = require('../services/project.service');
const { successResponse } = require('../utils/response');
const { createProjectSchema, updateProjectSchema } = require('../validations/project.validation');
const { BadRequestError } = require('../utils/errors');

/**
 * Create Project
 */
const createProject = async (req, res, next) => {
  try {
    const parseResult = createProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const newProject = await projectService.createProject(parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'CREATE_PROJECT',
      resource: 'Project',
      resourceId: newProject.id,
      newValues: newProject
    });

    return successResponse(res, newProject, 201);
  } catch (err) {
    next(err);
  }
};

/**
 * List Projects
 */
const listProjects = async (req, res, next) => {
  try {
    const { managerId, status, search } = req.query;

    const projects = await projectService.listProjects({
      organizationId: req.user.organizationId,
      managerId,
      status,
      search
    });

    return successResponse(res, projects);
  } catch (err) {
    next(err);
  }
};

/**
 * Get Project by ID
 */
const getProjectById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await projectService.getProjectById(id, req.user.organizationId);
    return successResponse(res, project);
  } catch (err) {
    next(err);
  }
};

/**
 * Update Project
 */
const updateProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const parseResult = updateProjectSchema.safeParse(req.body);
    if (!parseResult.success) {
      throw new BadRequestError('Validation failed', parseResult.error.flatten().fieldErrors);
    }

    const oldProject = await projectService.getProjectById(id, req.user.organizationId);
    const updatedProject = await projectService.updateProject(id, parseResult.data, req.user.organizationId);

    await req.logAudit({
      action: 'UPDATE_PROJECT',
      resource: 'Project',
      resourceId: id,
      oldValues: oldProject,
      newValues: updatedProject
    });

    return successResponse(res, updatedProject);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete Project
 */
const deleteProject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const oldProject = await projectService.getProjectById(id, req.user.organizationId);
    await projectService.deleteProject(id, req.user.organizationId);

    await req.logAudit({
      action: 'DELETE_PROJECT',
      resource: 'Project',
      resourceId: id,
      oldValues: oldProject
    });

    return successResponse(res, { message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject
};
