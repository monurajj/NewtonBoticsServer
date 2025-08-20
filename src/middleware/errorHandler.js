const logger = require('../utils/logger');

// Custom error class for API errors
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log the error
  logger.logError(err, req);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new ApiError(404, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate field value: ${field}. Please use another value.`;
    // Treat as Conflict (409) to indicate resource already exists
    error = new ApiError(409, message);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new ApiError(400, message);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token. Please log in again.';
    error = new ApiError(401, message);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired. Please log in again.';
    error = new ApiError(401, message);
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large. Please upload a smaller file.';
    error = new ApiError(400, message);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field.';
    error = new ApiError(400, message);
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests. Please try again later.';
    error = new ApiError(429, message);
  }

  // Socket.IO errors
  if (err.message && err.message.includes('Authentication error')) {
    const message = 'Socket authentication failed.';
    error = new ApiError(401, message);
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Don't leak error details in production
  const errorResponse = {
    success: false,
    error: {
      message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
        details: error,
      }),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  };

  // Emit concise console line for quick debugging with requestId if available
  try {
    const durationMs = req._startHrTime
      ? Number((process.hrtime.bigint() - req._startHrTime) / BigInt(1e6))
      : undefined;
    const rid = req.requestId || 'n/a';
    console.error(
      `[ERR] id=${rid} ${req.method} ${req.originalUrl} status=${statusCode} msg="${message}" duration=${durationMs ?? 'n/a'}ms`
    );
  } catch (_) {
    // Never block response on logging errors
  }

  // Send error response
  res.status(statusCode).json(errorResponse);

  // Log additional error details for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Details:', {
      statusCode,
      message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      body: req.body,
      params: req.params,
      query: req.query,
      user: req.user?.id || 'anonymous',
    });
  }
};

// Async error wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Not found handler for undefined routes
const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route ${req.originalUrl} not found`);
  next(error);
};

// Validation error handler
const validationErrorHandler = (errors) => {
  const message = errors.array().map(err => err.msg).join(', ');
  return new ApiError(400, message);
};

// Authorization error handler
const authorizationErrorHandler = (message = 'Access denied. Insufficient permissions.') => {
  return new ApiError(403, message);
};

// Authentication error handler
const authenticationErrorHandler = (message = 'Authentication required. Please log in.') => {
  return new ApiError(401, message);
};

// Resource not found error handler
const notFoundErrorHandler = (resource = 'Resource') => {
  return new ApiError(404, `${resource} not found`);
};

// Conflict error handler
const conflictErrorHandler = (message = 'Resource conflict.') => {
  return new ApiError(409, message);
};

// Too many requests error handler
const tooManyRequestsErrorHandler = (message = 'Too many requests. Please try again later.') => {
  return new ApiError(429, message);
};

// Internal server error handler
const internalServerErrorHandler = (message = 'Internal server error.') => {
  return new ApiError(500, message);
};

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
  ApiError,
  validationErrorHandler,
  authorizationErrorHandler,
  authenticationErrorHandler,
  notFoundErrorHandler,
  conflictErrorHandler,
  tooManyRequestsErrorHandler,
  internalServerErrorHandler,
};
