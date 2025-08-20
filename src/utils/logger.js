const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
  trace: 5,
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
  trace: 'white',
};

// Tell winston that you want to link the colors
winston.addColors(colors);

// Define which level to log based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Define format for logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Define format for file logs (without colors)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format,
    level: level(),
  }),
  
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(logsDir, 'app.log'),
    format: fileFormat,
    level: level(),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // File transport for error logs only
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    format: fileFormat,
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  format: fileFormat,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Add request logging middleware
logger.logRequest = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
    };
    
    if (res.statusCode >= 400) {
      logger.warn('HTTP Request', logData);
    } else {
      logger.http('HTTP Request', logData);
    }
  });
  
  next();
};

// Add error logging middleware
logger.logError = (error, req = null) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    statusCode: error.statusCode || 500,
  };
  
  if (req) {
    errorData.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || 'anonymous',
    };
  }
  
  logger.error('Application Error', errorData);
};

// Add database query logging
logger.logQuery = (query, duration) => {
  logger.debug('Database Query', {
    query: query.sql || query,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Add cache operation logging
logger.logCache = (operation, key, hit = false, duration = 0) => {
  logger.debug('Cache Operation', {
    operation,
    key,
    hit,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Add authentication logging
logger.logAuth = (action, userId, success, details = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication', {
    action,
    userId,
    success,
    details,
    timestamp: new Date().toISOString(),
  });
};

// Add file operation logging
logger.logFile = (operation, filename, size, duration = 0) => {
  logger.info('File Operation', {
    operation,
    filename,
    size: `${(size / 1024).toFixed(2)}KB`,
    duration: `${duration}ms`,
    timestamp: new Date().toISOString(),
  });
};

// Add performance logging
logger.logPerformance = (operation, duration, metadata = {}) => {
  const level = duration > 1000 ? 'warn' : 'debug';
  logger[level]('Performance', {
    operation,
    duration: `${duration}ms`,
    metadata,
    timestamp: new Date().toISOString(),
  });
};

// Export the logger
module.exports = logger;
