/**
 * Success response helper
 */
const successResponse = (res, data, status = 200, meta = undefined) => {
  return res.status(status).json({
    success: true,
    data,
    ...(meta ? { meta } : {})
  });
};

/**
 * Error response helper
 */
const errorResponse = (res, message, status = 500, details = null, code = 'INTERNAL_ERROR') => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
};

module.exports = {
  successResponse,
  errorResponse
};
