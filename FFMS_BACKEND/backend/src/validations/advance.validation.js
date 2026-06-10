const { z } = require('zod');

const createAdvanceSchema = z.object({
  amount: z.number().positive(),
  reason: z.string().optional()
});

const approveRejectAdvanceSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'])
});

module.exports = {
  createAdvanceSchema,
  approveRejectAdvanceSchema
};
