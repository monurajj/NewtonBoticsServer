const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    maxlength: [255, 'Email cannot exceed 255 characters'],
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ],
    index: true
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [100, 'First name cannot exceed 100 characters'],
    match: [/^[a-zA-Z\s\-']+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [100, 'Last name cannot exceed 100 characters'],
    match: [/^[a-zA-Z\s\-']+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['student', 'team_member', 'mentor', 'researcher', 'community', 'admin'],
      message: 'Role must be one of: student, team_member, mentor, researcher, community, admin'
    },
    default: 'student',
    index: true
  },
  studentId: {
    type: String,
    trim: true,
    maxlength: [50, 'Student ID cannot exceed 50 characters'],
    sparse: true,
    unique: true
  },
  department: {
    type: String,
    trim: true,
    maxlength: [100, 'Department cannot exceed 100 characters'],
    index: true
  },
  yearOfStudy: {
    type: Number,
    min: [1, 'Year of study must be at least 1'],
    max: [8, 'Year of study cannot exceed 8'],
    validate: {
      validator: Number.isInteger,
      message: 'Year of study must be a whole number'
    }
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Phone number cannot exceed 20 characters'],
    match: [/^[\+]?[1-9][\d]{0,15}$/, 'Please provide a valid phone number']
  },
  profileImageUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Profile image URL cannot exceed 500 characters'],
    match: [
      /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i,
      'Profile image must be a valid image URL'
    ]
  },
  bio: {
    type: String,
    trim: true,
    maxlength: [1000, 'Bio cannot exceed 1000 characters']
  },
  skills: [{
    type: String,
    trim: true,
    maxlength: [100, 'Skill cannot exceed 100 characters']
  }],
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  emailVerified: {
    type: Boolean,
    default: false,
    index: true
  },
  lastLogin: {
    type: Date
  },
  permissions: [{
    type: String,
    enum: {
      values: [
        'read:projects', 'write:projects', 'delete:projects', 'manage:projects',
        'read:workshops', 'write:workshops', 'delete:workshops',
        'read:events', 'write:events', 'delete:events',
        'read:inventory', 'write:inventory', 'delete:inventory', 'manage:inventory',
        'read:requests', 'write:requests', 'approve:requests',
        'read:news', 'write:news', 'delete:news',
        'read:media', 'write:media', 'delete:media',
        'read:users', 'write:users', 'delete:users',
        'manage:finance',
        'manage:system', 'system:admin'
      ],
      message: 'Invalid permission value'
    }
  }],
  preferences: {
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    },
    privacy: {
      profileVisibility: {
        type: String,
        enum: ['public', 'members', 'private'],
        default: 'members'
      },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false }
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  if (this.role === 'admin') {
    return `${this.firstName} ${this.lastName} (Admin)`;
  }
  if (this.role === 'mentor') {
    return `${this.firstName} ${this.lastName} (Mentor)`;
  }
  return this.fullName;
});

// Virtual for profile completion percentage
userSchema.virtual('profileCompletion').get(function() {
  const fields = ['firstName', 'lastName', 'email', 'department', 'yearOfStudy', 'bio', 'skills'];
  const completedFields = fields.filter(field => this[field] && 
    (Array.isArray(this[field]) ? this[field].length > 0 : true));
  return Math.round((completedFields.length / fields.length) * 100);
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: 1 });
userSchema.index({ 'skills': 1 });

// Text index for search
userSchema.index({
  firstName: 'text',
  lastName: 'text',
  skills: 'text',
  bio: 'text'
});

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  if (!this.isModified('passwordHash')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 12);
    this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to set default permissions based on role
userSchema.pre('save', function(next) {
  if (this.isModified('role') && !this.permissions.length) {
    this.permissions = this.getDefaultPermissions();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    sub: this._id,
    email: this.email,
    role: this.role,
    permissions: this.permissions
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    sub: this._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

// Instance method to get default permissions based on role
userSchema.methods.getDefaultPermissions = function() {
  const rolePermissions = {
    student: ['read:projects', 'read:workshops', 'read:events', 'read:inventory', 'read:news', 'read:media'],
    team_member: ['read:projects', 'write:projects', 'read:workshops', 'read:events', 'read:inventory', 'read:news', 'read:media'],
    mentor: ['read:projects', 'write:projects', 'delete:projects', 'read:workshops', 'write:workshops', 'read:events', 'write:events', 'read:inventory', 'write:inventory', 'read:requests', 'approve:requests', 'read:news', 'write:news', 'read:media', 'write:media'],
    researcher: ['read:projects', 'write:projects', 'delete:projects', 'read:workshops', 'write:workshops', 'delete:workshops', 'read:events', 'write:events', 'delete:events', 'read:inventory', 'write:inventory', 'delete:inventory', 'read:requests', 'write:requests', 'approve:requests', 'read:news', 'write:news', 'delete:news', 'read:media', 'write:media', 'delete:media'],
    community: ['read:projects', 'read:workshops', 'read:events', 'read:news', 'read:media'],
    admin: ['read:projects', 'write:projects', 'delete:projects', 'manage:projects', 'read:workshops', 'write:workshops', 'delete:workshops', 'read:events', 'write:events', 'delete:events', 'read:inventory', 'write:inventory', 'delete:inventory', 'manage:inventory', 'read:requests', 'write:requests', 'approve:requests', 'read:news', 'write:news', 'delete:news', 'read:media', 'write:media', 'delete:media', 'read:users', 'write:users', 'delete:users', 'manage:finance', 'manage:system', 'system:admin']
  };

  return rolePermissions[this.role] || [];
};

// Instance method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Instance method to check if user has any of the permissions
userSchema.methods.hasAnyPermission = function(permissions) {
  return permissions.some(permission => this.permissions.includes(permission));
};

// Instance method to check if user has all permissions
userSchema.methods.hasAllPermissions = function(permissions) {
  return permissions.every(permission => this.permissions.includes(permission));
};

// Instance method to update last login
userSchema.methods.updateLastLogin = async function() {
  this.lastLogin = new Date();
  await this.save();
};

// Instance method to deactivate account
userSchema.methods.deactivateAccount = async function() {
  this.isActive = false;
  await this.save();
  
  // Blacklist all user's tokens
  try {
    const redisClient = getRedisClient();
    // This would require storing token hashes in Redis for the user
    // Implementation depends on how tokens are stored
    logger.info(`Account deactivated for user ${this._id}`);
  } catch (error) {
    logger.error(`Failed to blacklist tokens for user ${this._id}:`, error);
  }
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to search users
userSchema.statics.search = function(query, options = {}) {
  const { role, department, skills, limit = 20, skip = 0 } = options;
  
  let searchQuery = { isActive: true };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (role) {
    searchQuery.role = role;
  }
  
  if (department) {
    searchQuery.department = department;
  }
  
  if (skills && skills.length > 0) {
    searchQuery.skills = { $in: skills };
  }
  
  return this.find(searchQuery)
    .select('-passwordHash')
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
};

// Static method to get user statistics
userSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        verifiedUsers: { $sum: { $cond: ['$emailVerified', 1, 0] } },
        roleDistribution: {
          $push: {
            role: '$role',
            count: 1
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalUsers: 1,
        activeUsers: 1,
        verifiedUsers: 1,
        roleDistribution: 1
      }
    }
  ]);
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    verifiedUsers: 0,
    roleDistribution: []
  };
};

// Export the model
module.exports = mongoose.model('User', userSchema);
