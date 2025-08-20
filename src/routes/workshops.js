const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const router = express.Router();
const { optionalAuth, verifyToken, requireTeamMember, requireMentor, requireAdmin, requireWorkshopInstructor, requireStudent } = require('../middleware/auth');
const { sendWorkshopRegistrationEmail } = require('../services/emailService');
const Workshop = require('../models/Workshop');
const { asyncHandler, validationErrorHandler, notFoundErrorHandler } = require('../middleware/errorHandler');

// TODO: Implement workshop routes
// - GET /api/workshops - List workshops
// - GET /api/workshops/:id - Get workshop details
// - POST /api/workshops - Create workshop
// - PUT /api/workshops/:id - Update workshop
// - DELETE /api/workshops/:id - Delete workshop
// - POST /api/workshops/:id/register - Register for workshop
// - DELETE /api/workshops/:id/register - Unregister from workshop
// - GET /api/workshops/:id/participants - Get workshop participants

router.get(
  '/',
  optionalAuth,
  [
    query('status').optional().isIn(['upcoming', 'ongoing', 'completed', 'cancelled']),
    query('category').optional().isString(),
    query('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    query('q').optional().isString(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('skip').optional().isInt({ min: 0 }).toInt(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const { status, category, level, q, limit = 20, skip = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (level) filter.level = level;
    if (q) filter.title = { $regex: q, $options: 'i' };
    const [items, total] = await Promise.all([
      Workshop.find(filter).limit(limit).skip(skip).sort({ startDate: 1 }),
      Workshop.countDocuments(filter),
    ]);
    res.json({ success: true, data: { items, pagination: { total, limit, skip, hasMore: total > skip + items.length } } });
  })
);

router.get('/:id', [param('id').isString()], asyncHandler(async (req, res) => {
  const item = await Workshop.findById(req.params.id);
  if (!item) throw notFoundErrorHandler('Workshop');
  res.json({ success: true, data: { item } });
}));

router.post(
  '/',
  verifyToken,
  requireMentor,
  [
    body('title').isString().isLength({ min: 5, max: 255 }),
    body('description').isString().isLength({ min: 20, max: 5000 }),
    body('instructorId').isString(),
    body('category').optional().isString(),
    body('level').isIn(['beginner', 'intermediate', 'advanced']),
    body('maxParticipants').isInt({ min: 1 }).toInt(),
    body('startDate').isISO8601(),
    body('endDate').isISO8601(),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) throw validationErrorHandler(errors);
    const created = await Workshop.create(req.body);
    res.status(201).json({ success: true, message: 'Workshop created', data: { item: created } });
  })
);

router.put('/:id', verifyToken, requireWorkshopInstructor, [param('id').isString()], asyncHandler(async (req, res) => {
  const updated = await Workshop.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!updated) throw notFoundErrorHandler('Workshop');
  res.json({ success: true, message: 'Workshop updated', data: { item: updated } });
}));

router.delete('/:id', verifyToken, requireMentor, [param('id').isString()], asyncHandler(async (req, res) => {
  const deleted = await Workshop.findByIdAndDelete(req.params.id);
  if (!deleted) throw notFoundErrorHandler('Workshop');
  res.json({ success: true, message: 'Workshop deleted' });
}));

router.post('/:id/register', verifyToken, requireStudent, async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ success: false, message: 'Workshop not found' });
    // naive registration (no duplicates enforcement here)
    workshop.registrations.push({ userId: req.user.id });
    workshop.currentParticipants = (workshop.currentParticipants || 0) + 1;
    await workshop.save();
    try { await sendWorkshopRegistrationEmail({ workshop, userEmail: req.user.email }); } catch (_) {}
    res.status(201).json({ success: true, message: 'Registered', data: { currentParticipants: workshop.currentParticipants } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to register' });
  }
});

router.delete('/:id/register', verifyToken, requireStudent, async (req, res) => {
  try {
    const w = await Workshop.findById(req.params.id);
    if (!w) return res.status(404).json({ success: false, message: 'Workshop not found' });
    const before = w.registrations.length;
    w.registrations = w.registrations.filter(r => String(r.userId) !== String(req.user.id));
    if (w.currentParticipants && w.registrations.length < before) w.currentParticipants -= 1;
    await w.save();
    res.json({ success: true, message: 'Unregistered', data: { currentParticipants: w.currentParticipants } });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Failed to unregister' });
  }
});

module.exports = router;
