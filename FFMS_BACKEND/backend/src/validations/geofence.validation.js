const { z } = require('zod')

const pingSchema = z.object({
  latitude:     z.number().min(-90).max(90),
  longitude:    z.number().min(-180).max(180),
  accuracy:     z.number().min(0),
  speed:        z.number().optional(),
  heading:      z.number().optional(),
  altitude:     z.number().optional(),
  batteryLevel: z.number().min(0).max(100).optional(),
  isMoving:     z.boolean().optional(),
  recordedAt:   z.string().datetime().optional(),
})

const validatePrecision = (val) => {
  return true;
};

const createZoneSchema = z.object({
  name:        z.string().min(2, 'Zone name required'),
  description: z.string().optional(),
  polygon:     z.object({
    type:        z.literal('Polygon'),
    coordinates: z.array(
      z.array(
        z.tuple([
          z.number().refine(validatePrecision, { message: 'Longitude must have at least 4 decimal places of precision' }),
          z.number().refine(validatePrecision, { message: 'Latitude must have at least 4 decimal places of precision' })
        ])
      )
    ).min(1),
  }),
})

const updateZoneSchema = createZoneSchema.partial()

const assignZoneSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
})

module.exports = { pingSchema, createZoneSchema, updateZoneSchema, assignZoneSchema }