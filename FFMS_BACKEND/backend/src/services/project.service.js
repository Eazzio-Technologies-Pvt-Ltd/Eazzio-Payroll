const prisma = require('../config/prisma');
const { NotFoundError } = require('../utils/errors');

const createProject = async (projectData, organizationId) => {
  const { startDate, endDate, ...rest } = projectData;
  const project = await prisma.project.create({
    data: {
      ...rest,
      organizationId,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true }
      }
    }
  });

  return {
    ...project,
    progress: 0,
    totalTasks: 0,
    completedTasks: 0
  };
};

const listProjects = async ({ organizationId, managerId, status, search }) => {
  const where = {
    organizationId,
    ...(managerId && { managerId }),
    ...(status && { status }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    })
  };

  const projects = await prisma.project.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      manager: {
        select: { id: true, name: true, email: true }
      },
      tasks: {
        select: { status: true }
      }
    }
  });

  return projects.map(p => {
    const totalTasks = p.tasks.length;
    const completedTasks = p.tasks.filter(t => t.status === 'COMPLETED').length;
    const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    const { tasks, ...projectWithoutTasks } = p;
    return {
      ...projectWithoutTasks,
      progress,
      totalTasks,
      completedTasks
    };
  });
};

const getProjectById = async (id, organizationId) => {
  const project = await prisma.project.findFirst({
    where: { id, organizationId },
    include: {
      manager: {
        select: { id: true, name: true, email: true }
      },
      tasks: true
    }
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    ...project,
    progress,
    totalTasks,
    completedTasks
  };
};

const updateProject = async (id, updateData, organizationId) => {
  const project = await prisma.project.findFirst({
    where: { id, organizationId }
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  const { startDate, endDate, ...rest } = updateData;

  const updatedProject = await prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
      ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
    },
    include: {
      manager: {
        select: { id: true, name: true, email: true }
      },
      tasks: {
        select: { status: true }
      }
    }
  });

  const totalTasks = updatedProject.tasks.length;
  const completedTasks = updatedProject.tasks.filter(t => t.status === 'COMPLETED').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const { tasks, ...projectWithoutTasks } = updatedProject;
  return {
    ...projectWithoutTasks,
    progress,
    totalTasks,
    completedTasks
  };
};

const deleteProject = async (id, organizationId) => {
  const project = await prisma.project.findFirst({
    where: { id, organizationId }
  });

  if (!project) {
    throw new NotFoundError('Project not found');
  }

  return prisma.project.delete({
    where: { id }
  });
};

module.exports = {
  createProject,
  listProjects,
  getProjectById,
  updateProject,
  deleteProject
};
