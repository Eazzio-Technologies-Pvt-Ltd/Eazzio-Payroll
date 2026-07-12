const { z } = require('zod');
const { TaskPriority, TaskStatus, AssignmentStatus } = require('@prisma/client');

const validatePrecision = (val) => {
  return true;
};

const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).default('MEDIUM'),
  dueDate: z.string().datetime().nullable().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  latitude: z.number().min(-90).max(90).refine(validatePrecision, {
    message: 'Latitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  longitude: z.number().min(-180).max(180).refine(validatePrecision, {
    message: 'Longitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  address: z.string().nullable().optional(),
  territoryId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  assigneeIds: z.array(z.string().uuid()).min(1, 'At least one assignee is required'),
  recurring: z.boolean().default(false),
  recurrenceRule: z.string().nullable().optional() // cron format
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  scheduledDate: z.string().datetime().nullable().optional(),
  latitude: z.number().min(-90).max(90).refine(validatePrecision, {
    message: 'Latitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  longitude: z.number().min(-180).max(180).refine(validatePrecision, {
    message: 'Longitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  address: z.string().nullable().optional(),
  territoryId: z.string().cuid().nullable().optional(),
  projectId: z.string().cuid().nullable().optional(),
  recurring: z.boolean().optional(),
  recurrenceRule: z.string().nullable().optional()
});

const updateAssignmentSchema = z.object({
  status: z.nativeEnum(AssignmentStatus),
  completionNote: z.string().optional(),
  completionImages: z.array(z.string()).optional() // Base64 image strings
});

const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment content cannot be empty')
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateAssignmentSchema,
  createCommentSchema
};
