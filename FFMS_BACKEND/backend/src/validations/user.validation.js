const { z } = require('zod');
const { Role, UserStatus } = require('@prisma/client');

const createUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  password: z.string().optional(),
  employeeId: z.string().min(1, 'Employee ID is required'),
  role: z.nativeEnum(Role).default('FIELD_STAFF'),
  status: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.nativeEnum(UserStatus).default('ACTIVE')),
  managerId: z.preprocess((val) => (val === '' || val === 'null' || val === null) ? null : val, z.string().nullable().optional()),
  territoryId: z.preprocess((val) => (val === '' || val === 'null' || val === null) ? null : val, z.string().nullable().optional()),
  department: z.string().optional(),
  profileImage: z.string().optional()
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().optional(),
  password: z.string().optional(),
  employeeId: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  status: z.preprocess((val) => typeof val === 'string' ? val.toUpperCase() : val, z.nativeEnum(UserStatus).optional()),
  managerId: z.preprocess((val) => (val === '' || val === 'null' || val === null) ? null : val, z.string().nullable().optional()),
  territoryId: z.preprocess((val) => (val === '' || val === 'null' || val === null) ? null : val, z.string().nullable().optional()),
  department: z.string().optional(),
  profileImage: z.string().optional()
});

const assignTerritorySchema = z.object({
  territoryId: z.string().cuid('Invalid territory ID format')
});

const forceResetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters')
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  assignTerritorySchema,
  forceResetPasswordSchema
};
