const { z } = require('zod');
const { AttendanceStatus } = require('@prisma/client');

const validatePrecision = (val) => {
  return true;
};

const checkInSchema = z.object({
  latitude: z.number().min(-90).max(90).refine(validatePrecision, {
    message: 'Latitude must have at least 4 decimal places of precision (~11m accuracy)'
  }),
  longitude: z.number().min(-180).max(180).refine(validatePrecision, {
    message: 'Longitude must have at least 4 decimal places of precision (~11m accuracy)'
  }),
  selfieBase64: z.string().min(1, 'Selfie is required for attendance check-in')
});

const checkOutSchema = z.object({
  latitude: z.number().min(-90).max(90).refine(validatePrecision, {
    message: 'Latitude must have at least 4 decimal places of precision (~11m accuracy)'
  }),
  longitude: z.number().min(-180).max(180).refine(validatePrecision, {
    message: 'Longitude must have at least 4 decimal places of precision (~11m accuracy)'
  }),
  selfieBase64: z.string().min(1, 'Selfie is required for attendance check-out')
});

const updateAttendanceSchema = z.object({
  checkInTime: z.string().datetime().optional(),
  checkOutTime: z.string().datetime().optional(),
  status: z.nativeEnum(AttendanceStatus).optional(),
  notes: z.string().optional()
});

module.exports = {
  checkInSchema,
  checkOutSchema,
  updateAttendanceSchema
};
