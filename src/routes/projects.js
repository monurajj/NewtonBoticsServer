const express = require('express');
const { query, param, body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const router = express.Router();
const {
  optionalAuth,
  verifyToken,
  requireTeamMember,
  requireMentor,
  requireAdmin,
  requireProjectTeamMember,
} = require('../middleware/auth');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');
const Project = require('../models/Project');
const { sendProjectCreatedNotification, sendProjectStatusChangedEmail } = require('../services/emailService');

// Helpers
const ensureObjectId = (id) => (mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null);

// GET /api/projects - list with filters
router.get(
  '/',
  optionalAuth,
  [
    query('q').optional().isString().isLength({ min: 1, max: 200 }),
    query('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'on_hold']),
    query('category').optional().isString().isLength({ min: 1, max: 100 }),
    query('mentorId').optional().isString(),
    query('teamLeaderId').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
    query('sort').optional().isIn(['createdAt', 'startDate', 'endDate', 'progress']).default('createdAt'),
    query('order').optional().isIn(['asc', 'desc']).default('desc'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);

    const {
      q,
      status,
      category,
      mentorId,
      teamLeaderId,
      limit = 20,
      skip = 0,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const filter = {};
    if (q) filter.$text = { $search: q };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (mentorId && ensureObjectId(mentorId)) filter.mentorId = ensureObjectId(mentorId);
    if (teamLeaderId && ensureObjectId(teamLeaderId)) filter.teamLeaderId = ensureObjectId(teamLeaderId);

    const sortSpec = { [sort]: order === 'asc' ? 1 : -1 };

    const [items, total] = await Promise.all([
      Project.find(filter)
        .populate('mentorId', 'firstName lastName email role')
        .populate('teamLeaderId', 'firstName lastName email role')
        .populate('teamMembers.userId', 'firstName lastName email role profileImageUrl')
        .limit(limit)
        .skip(skip)
        .sort(sortSpec),
      Project.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        projects: items,
        pagination: { total, limit, skip, hasMore: total > skip + items.length },
      },
    });
  })
);

// GET /api/projects/:id - details
router.get(
  '/:id',
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const objId = ensureObjectId(id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId)
      .populate('mentorId', 'firstName lastName email role')
      .populate('teamLeaderId', 'firstName lastName email role')
      .populate('teamMembers.userId', 'firstName lastName email role profileImageUrl');
    if (!project) throw notFoundErrorHandler('Project');
    res.json({ success: true, data: { project } });
  })
);

// POST /api/projects - create
router.post(
  '/',
  verifyToken,
  requireTeamMember,
  [
    body('title').isString().isLength({ min: 5, max: 255 }),
    body('description').isString().isLength({ min: 20, max: 5000 }),
    body('category').optional().isString().isLength({ min: 1, max: 100 }),
    body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'on_hold']).default('upcoming'),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('budget').optional().isFloat({ min: 0 }),
    body('mentorId').optional().isString(),
    body('teamLeaderId').isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);

    const {
      title,
      description,
      category,
      status = 'upcoming',
      startDate,
      endDate,
      budget,
      mentorId,
      teamLeaderId,
      imageUrl,
      videoUrl,
      githubUrl,
      documentationUrl,
      achievements,
      tags,
    } = req.body;

    const newProject = await Project.create({
      title,
      description,
      category,
      status,
      startDate,
      endDate,
      budget,
      mentorId: mentorId && ensureObjectId(mentorId),
      teamLeaderId: ensureObjectId(teamLeaderId),
      imageUrl,
      videoUrl,
      githubUrl,
      documentationUrl,
      achievements,
      tags,
    });

    const populated = await Project.findById(newProject._id)
      .populate('mentorId', 'firstName lastName email role')
      .populate('teamLeaderId', 'firstName lastName email role');

    // Notify mentor and team leader if emails exist
    const recipients = [populated?.mentorId?.email, populated?.teamLeaderId?.email].filter(Boolean);
    try { await sendProjectCreatedNotification({ project: populated.toObject(), recipients }); } catch (_) {}

    res.status(201).json({ success: true, message: 'Project created', data: { project: populated } });
  })
);

// PUT /api/projects/:id - update core fields
router.put(
  '/:id',
  verifyToken,
  requireProjectTeamMember,
  [
    param('id').isString(),
    body('title').optional().isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString().isLength({ min: 10, max: 5000 }),
    body('category').optional().isString().isLength({ min: 1, max: 100 }),
    body('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'on_hold']),
    body('startDate').optional().isISO8601(),
    body('endDate').optional().isISO8601(),
    body('budget').optional().isFloat({ min: 0 }),
    body('mentorId').optional().isString(),
    body('imageUrl').optional().isString(),
    body('videoUrl').optional().isString(),
    body('githubUrl').optional().isString(),
    body('documentationUrl').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { id } = req.params;
    const objId = ensureObjectId(id);
    if (!objId) throw notFoundErrorHandler('Project');

    const updateData = { ...req.body };
    if (updateData.mentorId) updateData.mentorId = ensureObjectId(updateData.mentorId);
    // Team leader cannot be changed via this endpoint for now
    delete updateData.teamLeaderId;

    // Compare status before update for notification
    const before = await Project.findById(objId);
    const project = await Project.findByIdAndUpdate(objId, updateData, { new: true })
      .populate('mentorId', 'firstName lastName email role')
      .populate('teamLeaderId', 'firstName lastName email role')
      .populate('teamMembers.userId', 'firstName lastName email role profileImageUrl');
    if (!project) throw notFoundErrorHandler('Project');
    if (before && updateData.status && before.status !== updateData.status) {
      const recipients = [project?.mentorId?.email, project?.teamLeaderId?.email].filter(Boolean);
      try { await sendProjectStatusChangedEmail({ project: project.toObject(), oldStatus: before.status, newStatus: updateData.status, recipients }); } catch (_) {}
    }
    res.json({ success: true, message: 'Project updated', data: { project } });
  })
);

// DELETE /api/projects/:id - delete (mentor+)
router.delete(
  '/:id',
  verifyToken,
  requireMentor,
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const objId = ensureObjectId(id);
    if (!objId) throw notFoundErrorHandler('Project');
    const deleted = await Project.findByIdAndDelete(objId);
    if (!deleted) throw notFoundErrorHandler('Project');
    res.json({ success: true, message: 'Project deleted' });
  })
);

// GET /api/projects/:id/members
router.get(
  '/:id/members',
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const objId = ensureObjectId(req.params.id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId).populate('teamMembers.userId', 'firstName lastName email role profileImageUrl');
    if (!project) throw notFoundErrorHandler('Project');
    res.json({ success: true, data: { members: project.teamMembers } });
  })
);

// POST /api/projects/:id/members - only team leader, mentor or admin can add
router.post(
  '/:id/members',
  verifyToken,
  [param('id').isString(), body('userId').isString(), body('role').isString().isLength({ min: 2, max: 100 })],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const objId = ensureObjectId(req.params.id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId);
    if (!project) throw notFoundErrorHandler('Project');

    const isLeader = project.teamLeaderId?.toString() === req.user.id;
    const isMentor = project.mentorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isLeader && !isMentor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only team leader, mentor, or admin can add members' });
    }

    const newMemberUserId = ensureObjectId(req.body.userId);
    if (!newMemberUserId) throw validationErrorHandler({ array: () => [{ msg: 'Invalid userId' }] });

    await project.addTeamMember(newMemberUserId, req.body.role, req.body.skills || [], req.body.responsibilities || []);
    const populated = await Project.findById(objId).populate('teamMembers.userId', 'firstName lastName email role profileImageUrl');
    res.status(201).json({ success: true, message: 'Member added', data: { members: populated.teamMembers } });
  })
);

// DELETE /api/projects/:id/members/:memberId - memberId is userId
router.delete(
  '/:id/members/:memberId',
  verifyToken,
  [param('id').isString(), param('memberId').isString()],
  asyncHandler(async (req, res) => {
    const objId = ensureObjectId(req.params.id);
    const memberUserId = ensureObjectId(req.params.memberId);
    if (!objId || !memberUserId) throw notFoundErrorHandler('Project');

    const project = await Project.findById(objId);
    if (!project) throw notFoundErrorHandler('Project');
    const isLeader = project.teamLeaderId?.toString() === req.user.id;
    const isMentor = project.mentorId?.toString() === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isLeader && !isMentor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only team leader, mentor, or admin can remove members' });
    }

    await project.removeTeamMember(memberUserId);
    const populated = await Project.findById(objId).populate('teamMembers.userId', 'firstName lastName email role profileImageUrl');
    res.json({ success: true, message: 'Member removed', data: { members: populated.teamMembers } });
  })
);

// GET /api/projects/:id/milestones
router.get(
  '/:id/milestones',
  [param('id').isString()],
  asyncHandler(async (req, res) => {
    const objId = ensureObjectId(req.params.id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId);
    if (!project) throw notFoundErrorHandler('Project');
    res.json({ success: true, data: { milestones: project.milestones } });
  })
);

// POST /api/projects/:id/milestones
router.post(
  '/:id/milestones',
  verifyToken,
  requireProjectTeamMember,
  [
    param('id').isString(),
    body('title').isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('dueDate').isISO8601(),
    body('assignedTo').optional().isString(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const objId = ensureObjectId(req.params.id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId);
    if (!project) throw notFoundErrorHandler('Project');

    project.addMilestone(req.body.title, req.body.description, req.body.dueDate, req.body.assignedTo && ensureObjectId(req.body.assignedTo));
    await project.save();
    res.status(201).json({ success: true, message: 'Milestone added', data: { milestones: project.milestones } });
  })
);

// PUT /api/projects/:id/milestones/:milestoneId
router.put(
  '/:id/milestones/:milestoneId',
  verifyToken,
  requireProjectTeamMember,
  [
    param('id').isString(),
    param('milestoneId').isString(),
    body('title').optional().isString().isLength({ min: 3, max: 255 }),
    body('description').optional().isString().isLength({ max: 1000 }),
    body('dueDate').optional().isISO8601(),
    body('status').optional().isIn(['pending', 'in_progress', 'completed', 'overdue']),
    body('completedAt').optional().isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const objId = ensureObjectId(req.params.id);
    if (!objId) throw notFoundErrorHandler('Project');
    const project = await Project.findById(objId);
    if (!project) throw notFoundErrorHandler('Project');

    const milestone = project.milestones.id(req.params.milestoneId);
    if (!milestone) return res.status(404).json({ success: false, message: 'Milestone not found' });

    const up = req.body;
    if (up.title !== undefined) milestone.title = up.title;
    if (up.description !== undefined) milestone.description = up.description;
    if (up.dueDate !== undefined) milestone.dueDate = up.dueDate;
    if (up.status !== undefined) {
      milestone.status = up.status;
      if (up.status === 'completed' && up.completedAt) milestone.completedAt = up.completedAt;
    }

    await project.save();
    res.json({ success: true, message: 'Milestone updated', data: { milestones: project.milestones } });
  })
);

module.exports = router;
