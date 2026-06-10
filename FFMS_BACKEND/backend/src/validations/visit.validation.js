const { z } = require('zod');
const { VisitType, VisitStatus } = require('@prisma/client');

const validatePrecision = (val) => {
  return true;
};

const createVisitReportSchema = z.object({
  taskAssignmentId: z.string().cuid().nullable().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().optional(),
  customerAddress: z.string().optional(),
  visitType: z.nativeEnum(VisitType).default('OTHER'),
  visitStatus: z.nativeEnum(VisitStatus).default('COMPLETED'),
  latitude: z.number().min(-90).max(90).refine(validatePrecision, {
    message: 'Latitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  longitude: z.number().min(-180).max(180).refine(validatePrecision, {
    message: 'Longitude must have at least 4 decimal places of precision (~11m accuracy)'
  }).nullable().optional(),
  notes: z.string().optional(),
  feedback: z.string().optional(),
  images: z.array(z.string()).default([]), // Base64 strings
  signatureBase64: z.string().nullable().optional(), // Base64 string
  checkInTime: z.string().datetime().nullable().optional(),
  checkOutTime: z.string().datetime().nullable().optional(),
  nextFollowUpDate: z.string().datetime().nullable().optional()
});

module.exports = {
  createVisitReportSchema
};
