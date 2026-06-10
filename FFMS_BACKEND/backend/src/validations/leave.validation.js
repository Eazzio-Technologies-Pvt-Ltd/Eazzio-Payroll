const {z} = require ('zod');
const applyLeaveSchema = z.object({
    type:z.enum(['SICK', 'CASUAL' ,'EARNED' , 'UNPAID', 'OTHER']),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
    reason: z.string().min(5).optional(),
    attachmentBase64: z.string().optional(),
}).refine(data => new Date(data.startDate) <= new Date(data.endDate), {
   message: 'startDate must be before or equal to endDate',
   path: ['endDate'],
})
const approveRejectSchema = z.object({
  approvalNote: z.string().optional(),
})

module.exports = { applyLeaveSchema, approveRejectSchema }