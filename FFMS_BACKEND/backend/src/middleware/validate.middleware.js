const { ZodError } = require('zod')

const validate = (schema, source = 'body') => (req, res, next) => {
  try {
    req[source] = schema.parse(req[source])
    next()
  } catch (err) {
    if (err instanceof ZodError) {
      const errors = err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      }))
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors,
        timestamp: new Date().toISOString(),
      })
    }
    next(err)
  }
}

module.exports = { validate }