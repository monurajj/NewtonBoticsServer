const mongoose = require('mongoose');
const logger = require('../utils/logger');

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Project title is required'],
    trim: true,
    maxlength: [255, 'Project title cannot exceed 255 characters'],
    index: true
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [5000, 'Project description cannot exceed 5000 characters']
  },
  category: {
    type: String,
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
    index: true
  },
  status: {
    type: String,
    required: [true, 'Project status is required'],
    enum: {
      values: ['upcoming', 'ongoing', 'completed', 'on_hold'],
      message: 'Status must be one of: upcoming, ongoing, completed, on_hold'
    },
    default: 'upcoming',
    index: true
  },
  startDate: {
    type: Date,
    index: true,
    validate: {
      validator: function(value) {
        if (this.status === 'completed' && !value) {
          return false;
        }
        return true;
      },
      message: 'Start date is required for completed projects'
    }
  },
  endDate: {
    type: Date,
    index: true,
    validate: {
      validator: function(value) {
        if (value && this.startDate && value <= this.startDate) {
          return false;
        }
        return true;
      },
      message: 'End date must be after start date'
    }
  },
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Budget must be a valid number'
    }
  },
  mentorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    validate: {
      validator: async function(value) {
        if (!value) return true;
        const User = mongoose.model('User');
        const user = await User.findById(value);
        return user && ['mentor', 'researcher', 'admin'].includes(user.role);
      },
      message: 'Mentor must be a mentor, researcher, or admin'
    }
  },
  teamLeaderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team leader is required'],
    index: true,
    validate: {
      validator: async function(value) {
        if (!value) return false;
        const User = mongoose.model('User');
        const user = await User.findById(value);
        return user && ['team_member', 'mentor', 'researcher', 'admin'].includes(user.role);
      },
      message: 'Team leader must be a team member, mentor, researcher, or admin'
    }
  },
  imageUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Image URL cannot exceed 500 characters'],
    match: [
      /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i,
      'Image must be a valid image URL'
    ]
  },
  videoUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Video URL cannot exceed 500 characters'],
    match: [
      /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com)\/.+/i,
      'Video must be a valid video platform URL'
    ]
  },
  githubUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'GitHub URL cannot exceed 500 characters'],
    match: [
      /^https?:\/\/(www\.)?github\.com\/.+/i,
      'GitHub URL must be a valid GitHub repository URL'
    ]
  },
  documentationUrl: {
    type: String,
    trim: true,
    maxlength: [500, 'Documentation URL cannot exceed 500 characters'],
    match: [
      /^https?:\/\/.+/i,
      'Documentation must be a valid URL'
    ]
  },
  achievements: [{
    type: String,
    trim: true,
    maxlength: [500, 'Achievement cannot exceed 500 characters']
  }],
  teamMembers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team member user ID is required'],
      validate: {
        validator: async function(value) {
          const User = mongoose.model('User');
          const user = await User.findById(value);
          return user && user.isActive;
        },
        message: 'Team member must be an active user'
      }
    },
    role: {
      type: String,
      required: [true, 'Team member role is required'],
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: [100, 'Skill cannot exceed 100 characters']
    }],
    responsibilities: [{
      type: String,
      trim: true,
      maxlength: [200, 'Responsibility cannot exceed 200 characters']
    }],
    timeCommitment: {
      hoursPerWeek: {
        type: Number,
        min: [1, 'Time commitment must be at least 1 hour per week'],
        max: [40, 'Time commitment cannot exceed 40 hours per week']
      }
    }
  }],
  milestones: [{
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [255, 'Milestone title cannot exceed 255 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Milestone description cannot exceed 1000 characters']
    },
    dueDate: {
      type: Date,
      required: [true, 'Milestone due date is required'],
      validate: {
        validator: function(value) {
          if (this.parent().startDate && value < this.parent().startDate) {
            return false;
          }
          if (this.parent().endDate && value > this.parent().endDate) {
            return false;
          }
          return true;
        },
        message: 'Milestone due date must be within project timeline'
      }
    },
    completedAt: {
      type: Date,
      validate: {
        validator: function(value) {
          if (value && value > this.dueDate) {
            return false;
          }
          return true;
        },
        message: 'Completion date cannot be after due date'
      }
    },
    status: {
      type: String,
      enum: {
        values: ['pending', 'in_progress', 'completed', 'overdue'],
        message: 'Status must be one of: pending, in_progress, completed, overdue'
      },
      default: 'pending'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dependencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone'
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Priority must be one of: low, medium, high, critical'
    },
    default: 'medium'
  },
  difficulty: {
    type: String,
    enum: {
      values: ['beginner', 'intermediate', 'advanced', 'expert'],
      message: 'Difficulty must be one of: beginner, intermediate, advanced, expert'
    },
    default: 'intermediate'
  },
  estimatedHours: {
    type: Number,
    min: [1, 'Estimated hours must be at least 1'],
    validate: {
      validator: Number.isFinite,
      message: 'Estimated hours must be a valid number'
    }
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
    validate: {
      validator: Number.isFinite,
      message: 'Actual hours must be a valid number'
    }
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100%'],
    default: 0,
    validate: {
      validator: Number.isFinite,
      message: 'Progress must be a valid number'
    }
  },
  isPublic: {
    type: Boolean,
    default: true,
    index: true
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true
  },
  viewCount: {
    type: Number,
    default: 0,
    min: [0, 'View count cannot be negative']
  },
  rating: {
    average: {
      type: Number,
      min: [0, 'Average rating cannot be negative'],
      max: [5, 'Average rating cannot exceed 5'],
      default: 0
    },
    count: {
      type: Number,
      default: 0,
      min: [0, 'Rating count cannot be negative']
    }
  },
  comments: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for project duration
projectSchema.virtual('duration').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }
  return null;
});

// Virtual for project status
projectSchema.virtual('isOverdue').get(function() {
  if (this.endDate && this.status !== 'completed') {
    return new Date() > this.endDate;
  }
  return false;
});

// Virtual for completed milestones count
projectSchema.virtual('completedMilestonesCount').get(function() {
  return this.milestones.filter(milestone => milestone.status === 'completed').length;
});

// Virtual for total milestones count
projectSchema.virtual('totalMilestonesCount').get(function() {
  return this.milestones.length;
});

// Virtual for team size
projectSchema.virtual('teamSize').get(function() {
  return this.teamMembers.length + 1; // +1 for team leader
});

// Indexes for performance
projectSchema.index({ title: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ category: 1 });
projectSchema.index({ startDate: 1 });
projectSchema.index({ endDate: 1 });
projectSchema.index({ mentorId: 1 });
projectSchema.index({ teamLeaderId: 1 });
projectSchema.index({ createdAt: 1 });
projectSchema.index({ isPublic: 1 });
projectSchema.index({ isFeatured: 1 });
projectSchema.index({ 'teamMembers.userId': 1 });
projectSchema.index({ 'milestones.status': 1 });
projectSchema.index({ 'milestones.dueDate': 1 });
projectSchema.index({ tags: 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ difficulty: 1 });

// Compound indexes
projectSchema.index({ status: 1, category: 1 });
projectSchema.index({ status: 1, startDate: 1 });
projectSchema.index({ mentorId: 1, status: 1 });
projectSchema.index({ teamLeaderId: 1, status: 1 });

// Text index for search
projectSchema.index({
  title: 'text',
  description: 'text',
  category: 'text',
  tags: 'text'
});

// Pre-save middleware to update progress based on milestones
projectSchema.pre('save', function(next) {
  if (this.milestones && this.milestones.length > 0) {
    const completedCount = this.milestones.filter(m => m.status === 'completed').length;
    this.progress = Math.round((completedCount / this.milestones.length) * 100);
  }
  next();
});

// Pre-save middleware to update milestone status based on dates
projectSchema.pre('save', function(next) {
  if (this.milestones) {
    const now = new Date();
    this.milestones.forEach(milestone => {
      if (milestone.status !== 'completed' && milestone.dueDate && now > milestone.dueDate) {
        milestone.status = 'overdue';
      }
    });
  }
  next();
});

// Instance method to add team member
projectSchema.methods.addTeamMember = async function(userId, role, skills = [], responsibilities = []) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  
  if (!user) {
    throw new Error('User not found');
  }
  
  if (!user.isActive) {
    throw new Error('User is not active');
  }
  
  // Check if user is already a team member
  const existingMember = this.teamMembers.find(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (existingMember) {
    throw new Error('User is already a team member');
  }
  
  this.teamMembers.push({
    userId,
    role,
    skills,
    responsibilities,
    joinedAt: new Date()
  });
  
  await this.save();
  return this;
};

// Instance method to remove team member
projectSchema.methods.removeTeamMember = async function(userId) {
  const memberIndex = this.teamMembers.findIndex(member => 
    member.userId.toString() === userId.toString()
  );
  
  if (memberIndex === -1) {
    throw new Error('User is not a team member');
  }
  
  // Cannot remove team leader
  if (this.teamLeaderId.toString() === userId.toString()) {
    throw new Error('Cannot remove team leader');
  }
  
  this.teamMembers.splice(memberIndex, 1);
  await this.save();
  return this;
};

// Instance method to add milestone
projectSchema.methods.addMilestone = function(title, description, dueDate, assignedTo = null) {
  this.milestones.push({
    title,
    description,
    dueDate,
    assignedTo,
    status: 'pending'
  });
  
  return this;
};

// Instance method to update milestone status
projectSchema.methods.updateMilestoneStatus = function(milestoneId, status, completedAt = null) {
  const milestone = this.milestones.id(milestoneId);
  
  if (!milestone) {
    throw new Error('Milestone not found');
  }
  
  milestone.status = status;
  if (status === 'completed' && completedAt) {
    milestone.completedAt = completedAt;
  }
  
  return this;
};

// Instance method to calculate project statistics
projectSchema.methods.getStatistics = function() {
  const stats = {
    totalMilestones: this.milestones.length,
    completedMilestones: this.milestones.filter(m => m.status === 'completed').length,
    overdueMilestones: this.milestones.filter(m => m.status === 'overdue').length,
    teamSize: this.teamMembers.length + 1, // +1 for team leader
    progress: this.progress,
    isOverdue: this.isOverdue,
    duration: this.duration
  };
  
  return stats;
};

// Static method to find projects by status
projectSchema.statics.findByStatus = function(status) {
  return this.find({ status, isPublic: true });
};

// Static method to find projects by category
projectSchema.statics.findByCategory = function(category) {
  return this.find({ category, isPublic: true });
};

// Static method to find projects by mentor
projectSchema.statics.findByMentor = function(mentorId) {
  return this.find({ mentorId, isPublic: true });
};

// Static method to find projects by team leader
projectSchema.statics.findByTeamLeader = function(teamLeaderId) {
  return this.find({ teamLeaderId, isPublic: true });
};

// Static method to find projects by team member
projectSchema.statics.findByTeamMember = function(userId) {
  return this.find({
    $or: [
      { teamLeaderId: userId },
      { 'teamMembers.userId': userId }
    ],
    isPublic: true
  });
};

// Static method to search projects
projectSchema.statics.search = function(query, options = {}) {
  const { status, category, mentorId, teamLeaderId, priority, difficulty, limit = 20, skip = 0 } = options;
  
  let searchQuery = { isPublic: true };
  
  if (query) {
    searchQuery.$text = { $search: query };
  }
  
  if (status) {
    searchQuery.status = status;
  }
  
  if (category) {
    searchQuery.category = category;
  }
  
  if (mentorId) {
    searchQuery.mentorId = mentorId;
  }
  
  if (teamLeaderId) {
    searchQuery.teamLeaderId = teamLeaderId;
  }
  
  if (priority) {
    searchQuery.priority = priority;
  }
  
  if (difficulty) {
    searchQuery.difficulty = difficulty;
  }
  
  return this.find(searchQuery)
    .populate('mentorId', 'firstName lastName email role')
    .populate('teamLeaderId', 'firstName lastName email role')
    .populate('teamMembers.userId', 'firstName lastName email role profileImageUrl')
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });
};

// Static method to get project statistics
projectSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalProjects: { $sum: 1 },
        activeProjects: { $sum: { $cond: [{ $eq: ['$status', 'ongoing'] }, 1, 0] } },
        completedProjects: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        upcomingProjects: { $sum: { $cond: [{ $eq: ['$status', 'upcoming'] }, 1, 0] } },
        onHoldProjects: { $sum: { $cond: [{ $eq: ['$status', 'on_hold'] }, 1, 0] } },
        totalBudget: { $sum: { $ifNull: ['$budget', 0] } },
        averageProgress: { $avg: { $ifNull: ['$progress', 0] } }
      }
    },
    {
      $project: {
        _id: 0,
        totalProjects: 1,
        activeProjects: 1,
        completedProjects: 1,
        upcomingProjects: 1,
        onHoldProjects: 1,
        totalBudget: 1,
        averageProgress: { $round: ['$averageProgress', 2] }
      }
    }
  ]);
  
  return stats[0] || {
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    upcomingProjects: 0,
    onHoldProjects: 0,
    totalBudget: 0,
    averageProgress: 0
  };
};

// Export the model
module.exports = mongoose.model('Project', projectSchema);
