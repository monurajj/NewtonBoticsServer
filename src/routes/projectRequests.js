const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireTeamMember, requireMentor, requireAdmin } = require('../middleware/auth');
const ProjectRequest = require('../models/ProjectRequest');
const { sendProjectRequestStatusEmail } = require('../services/emailService');
const User = require('../models/User');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement project requests routes
// - GET /api/project-requests - List project requests
// - GET /api/project-requests/:id - Get project request details
// - POST /api/project-requests - Create project request
// - PUT /api/project-requests/:id - Update project request
// - DELETE /api/project-requests/:id - Delete project request
// - POST /api/project-requests/:id/approve - Approve project request
// - POST /api/project-requests/:id/reject - Reject project request

router.get(
  '/',
  optionalAuth,
  [
    query('status').optional().isIn(['pending', 'under_review', 'approved', 'rejected', 'on_hold']),
    query('mentorId').optional().isString(),
    query('submittedBy').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { status, mentorId, submittedBy, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (mentorId) filter.mentorId = mentorId;
    if (submittedBy) filter.submittedBy = submittedBy;
    const [items, total] = await Promise.all([
      ProjectRequest.find(filter).limit(limit).skip(skip).sort({ submittedAt: -1 }),
      ProjectRequest.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, pagination: { total, limit, skip, hasMore: total > skip + items.length } } });
  })
);

router.get('/:id', [param('id').isString()], asyncHandler(async (req, res) => {
  const item = await ProjectRequest.findById(req.params.id);
  if (!item) throw notFoundErrorHandler('ProjectRequest');
  res.json({ success: true, data: { item } });
}));

router.post(
  '/',
  verifyToken,
  requireTeamMember,
  [
    body('title').isString().isLength({ min: 5, max: 255 }),
    body('description').isString().isLength({ min: 20, max: 5000 }),
    body('teamSize').isInt({ min: 1, max: 20 }).toInt(),
    body('estimatedDurationMonths').isInt({ min: 1, max: 24 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const payload = { ...req.body, submittedBy: req.user.id, submittedAt: new Date() };
    const created = await ProjectRequest.create(payload);
    res.status(201).json({ success: true, message: 'Project request created', data: { item: created } });
  })
);

router.put('/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await ProjectRequest.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('ProjectRequest');
  res.json({ success: true, message: 'Project request updated', data: { item: updated } });
}));

router.post('/:id/approve', verifyToken, requireMentor, async (req, res) => {
  const pr = await ProjectRequest.findByIdAndUpdate(req.params.id, { status: 'approved', approvalDate: new Date() }, { new: true });
  if (!pr) return res.status(404).json({ success: false, message: 'Request not found' });
  try {
    const submitter = await User.findById(pr.submittedBy);
    await sendProjectRequestStatusEmail({ request: pr.toObject(), newStatus: 'approved', recipientEmail: submitter?.email });
  } catch (_) {}
  res.json({ success: true, message: 'Request approved', data: { request: pr } });
});

router.post('/:id/reject', verifyToken, requireMentor, async (req, res) => {
  const pr = await ProjectRequest.findByIdAndUpdate(req.params.id, { status: 'rejected', reviewedAt: new Date(), reviewNotes: req.body?.reason }, { new: true });
  if (!pr) return res.status(404).json({ success: false, message: 'Request not found' });
  try {
    const submitter = await User.findById(pr.submittedBy);
    await sendProjectRequestStatusEmail({ request: pr.toObject(), newStatus: 'rejected', recipientEmail: submitter?.email });
  } catch (_) {}
  res.json({ success: true, message: 'Request rejected', data: { request: pr } });
});

router.delete('/:id', verifyToken, requireAdmin, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await ProjectRequest.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('ProjectRequest');
  res.json({ success: true, message: 'Project request deleted' });
}));

module.exports = router;
