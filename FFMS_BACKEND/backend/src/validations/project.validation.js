const { z } = require('zod');
const { ProjectStatus } = require('@prisma/client');

const createProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).default('ACTIVE'),
  managerId: z.string().min(1, 'Manager ID is required'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  status: z.nativeEnum(ProjectStatus).optional(),
  managerId: z.string().optional(),
});

module.exports = {
  createProjectSchema,
  updateProjectSchema
};
