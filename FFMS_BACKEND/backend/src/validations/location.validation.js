const { z } = require('zod');

const singleLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number(),
  speed: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  altitude: z.number().nullable().optional(),
  batteryLevel: z.number().nullable().optional(),
  isMoving: z.boolean().default(true),
  recordedAt: z.string().datetime()
});

const batchLocationSchema = z.object({
  locations: z.array(singleLocationSchema).max(50, 'Maximum 50 locations per batch allowed')
});

const locationHistorySchema = z.object({
  startDate: z.string().optional(), // YYYY-MM-DD
  endDate: z.string().optional() // YYYY-MM-DD
});

module.exports = {
  batchLocationSchema,
  locationHistorySchema
};
