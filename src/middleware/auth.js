const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');
const User = require('../models/User');
const logger = require('../utils/logger');
const { 
  authenticationErrorHandler, 
  authorizationErrorHandler,
  asyncHandler,
  notFoundErrorHandler,
} = require('./errorHandler');

const isRedisEnabled = () => process.env.REDIS_ENABLED === 'true';

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(authenticationErrorHandler('Access token required'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Check if token is blacklisted (only when Redis is enabled)
    if (isRedisEnabled()) {
      const redisClient = getRedisClient();
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return next(authenticationErrorHandler('Token has been revoked'));
      }
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.sub).select('-passwordHash');
    
    if (!user) {
      return next(authenticationErrorHandler('User no longer exists'));
    }

    if (!user.isActive) {
      return next(authenticationErrorHandler('User account is deactivated'));
    }

    // Add user info to request
    req.user = {
      id: user._id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      permissions: user.permissions || [],
    };

    // Log successful authentication
    logger.logAuth('token_verification', user._id, true, {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
    });

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(authenticationErrorHandler('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(authenticationErrorHandler('Token expired'));
    }
    
    logger.error('Token verification error:', error);
    return next(authenticationErrorHandler('Token verification failed'));
  }
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Continue without authentication
    }

    const token = authHeader.substring(7);
    
    // Check if token is blacklisted (only when Redis is enabled)
    if (isRedisEnabled()) {
      const redisClient = getRedisClient();
      const isBlacklisted = await redisClient.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return next(); // Continue without authentication
      }
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findById(decoded.sub).select('-passwordHash');
    
    if (user && user.isActive) {
      req.user = {
        id: user._id,
        email: user.email,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        permissions: user.permissions || [],
      };
    }

    next();
  } catch (error) {
    // Continue without authentication on any error
    next();
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(authenticationErrorHandler());
    }

    if (!roles.includes(req.user.role)) {
      return next(authorizationErrorHandler(
        `Access denied. Required roles: ${roles.join(', ')}`
      ));
    }

    next();
  };
};

// Permission-based access control
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(authenticationErrorHandler());
    }

    const userPermissions = req.user.permissions || [];
    const hasPermission = permissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return next(authorizationErrorHandler(
        `Access denied. Required permissions: ${permissions.join(', ')}`
      ));
    }

    next();
  };
};

// Admin only access
const requireAdmin = requireRole('admin');

// Mentor or higher access
const requireMentor = requireRole('mentor', 'researcher', 'admin');

// Team member or higher access
const requireTeamMember = requireRole('team_member', 'mentor', 'researcher', 'admin');

// Student or higher access
const requireStudent = requireRole('student', 'team_member', 'mentor', 'researcher', 'admin');

// Resource ownership check
const requireOwnership = (model, resourceIdField = 'id') => {
  return asyncHandler(async (req, res, next) => {
    if (!req.user) {
      return next(authenticationErrorHandler());
    }

    const resourceId = req.params[resourceIdField];
    const resource = await model.findById(resourceId);

    if (!resource) {
      return next(notFoundErrorHandler('Resource'));
    }

    // Admin can access any resource
    if (req.user.role === 'admin') {
      req.resource = resource;
      return next();
    }

    // Check if user owns the resource
    const ownershipField = resource.userId ? 'userId' : 'createdBy';
    if (resource[ownershipField] && resource[ownershipField].toString() === req.user.id) {
      req.resource = resource;
      return next();
    }

    // Check if user is a team member (for projects)
    if (resource.teamMembers && Array.isArray(resource.teamMembers)) {
      const isTeamMember = resource.teamMembers.some(member => 
        member.userId.toString() === req.user.id
      );
      if (isTeamMember) {
        req.resource = resource;
        return next();
      }
    }

    return next(authorizationErrorHandler('Access denied. You do not own this resource'));
  });
};

// Project team member check
const requireProjectTeamMember = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(authenticationErrorHandler());
  }

  const projectId = req.params.id || req.params.projectId;
  const Project = require('../models/Project');
  const project = await Project.findById(projectId);

  if (!project) {
    return next(notFoundErrorHandler('Project'));
  }

  // Admin can access any project
  if (req.user.role === 'admin') {
    req.project = project;
    return next();
  }

  // Check if user is team leader or mentor
  if (project.teamLeaderId?.toString() === req.user.id || 
      project.mentorId?.toString() === req.user.id) {
    req.project = project;
    return next();
  }

  // Check if user is a team member
  const isTeamMember = project.teamMembers.some(member => 
    member.userId.toString() === req.user.id
  );

  if (isTeamMember) {
    req.project = project;
    return next();
  }

  return next(authorizationErrorHandler('Access denied. You are not a member of this project'));
});

// Workshop instructor check
const requireWorkshopInstructor = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(authenticationErrorHandler());
  }

  const workshopId = req.params.id || req.params.workshopId;
  const Workshop = require('../models/Workshop');
  const workshop = await Workshop.findById(workshopId);

  if (!workshop) {
    return next(notFoundErrorHandler('Workshop'));
  }

  // Admin can access any workshop
  if (req.user.role === 'admin') {
    req.workshop = workshop;
    return next();
  }

  // Check if user is the instructor
  if (workshop.instructorId.toString() === req.user.id) {
    req.workshop = workshop;
    return next();
  }

  return next(authorizationErrorHandler('Access denied. You are not the instructor of this workshop'));
});

// Rate limiting for authentication endpoints
const authRateLimit = require('express-rate-limit')({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAdmin,
  requireMentor,
  requireTeamMember,
  requireStudent,
  requireOwnership,
  requireProjectTeamMember,
  requireWorkshopInstructor,
  authRateLimit,
};
