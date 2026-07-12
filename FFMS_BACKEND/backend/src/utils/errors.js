class AppError extends Error {
  constructor(message, statusCode, code = 'APP_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Bad Request', details = null) {
    super(message, 400, 'BAD_REQUEST_ERROR', details);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', details = null) {
    super(message, 401, 'UNAUTHORIZED_ERROR', details);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', details = null) {
    super(message, 403, 'FORBIDDEN_ERROR', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not Found', details = null) {
    super(message, 404, 'NOT_FOUND_ERROR', details);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict', details = null) {
    super(message, 409, 'CONFLICT_ERROR', details);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
