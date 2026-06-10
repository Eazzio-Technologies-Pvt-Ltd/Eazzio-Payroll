const { z } = require('zod')

const createExpenseSchema = z.object({
  category:    z.enum(['TRAVEL', 'FOOD', 'ACCOMMODATION', 'OTHER']),
  amount:      z.number().positive('Amount must be greater than 0'),
  description: z.string().min(3).optional(),
  receiptUrl:  z.string().url().optional(),
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  taskId:      z.string().optional(),
})

const updateExpenseSchema = createExpenseSchema.partial()

const approveRejectSchema = z.object({
  approvalNote: z.string().optional(),
})

module.exports = { createExpenseSchema, updateExpenseSchema, approveRejectSchema }